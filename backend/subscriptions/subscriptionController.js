
import db from "../config/db.js";

import {
  getActiveSubscriptionPlans,
  getActiveSubscriptionPlanById,
  createBusinessSubscription,
  getBusinessSubscription,
  getBusinessSubscriptionForUpdate,
  countActiveBusinessEmployees,
  getSubscriptionPlanLevel,
  updateBusinessSubscriptionPlan,
  scheduleBusinessSubscriptionPlanChange,
} from "../models/subscriptionModel.js";

import { createActivityLog } from "../activityLogs/activityLogModel.js";

// Retrieve the authenticated business's current subscription.
export async function getCurrentSubscription(req, res) {
  try {
    const businessId = req.user?.business_id;

    if (!Number.isSafeInteger(businessId) || businessId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid business authentication.",
      });
    }

    const subscription = await getBusinessSubscription(businessId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No subscription was found for this business.",
      });
    }

    return res.status(200).json({
      success: true,
      subscription,
    });
  } catch (error) {
    console.error(
      "Retrieve current subscription error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve your subscription.",
    });
  }
}

// Retrieve available subscription plans.
export async function getPlans(req, res) {
  try {
    const plans = await getActiveSubscriptionPlans();

    return res.status(200).json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error("Retrieve subscription plans error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve subscription plans.",
    });
  }
}

// Select a subscription plan for a newly registered business.
export async function selectPlan(req, res) {
  let connection;

  try {
    const businessId = req.registration?.business_id;
    const { plan_id, billing_cycle = "monthly" } = req.body;

    // Validate the registration business ID.
    if (!Number.isSafeInteger(businessId) || businessId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid registration session.",
      });
    }

    // Validate the selected plan.
    if (!Number.isSafeInteger(plan_id) || plan_id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid subscription plan.",
      });
    }

    // Validate the billing cycle.
    if (!["monthly", "annual"].includes(billing_cycle)) {
      return res.status(400).json({
        success: false,
        message: "Billing cycle must be monthly or annual.",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Prevent a registration token from creating duplicate subscriptions.
    const [existingSubscriptions] = await connection.execute(
      `SELECT id
       FROM business_subscriptions
       WHERE active_business_id = ?
       LIMIT 1
       FOR UPDATE`,
      [businessId]
    );

    if (existingSubscriptions.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "A subscription has already been created for this business.",
      });
    }

    // Confirm that the selected plan exists and is active.
    const plan = await getActiveSubscriptionPlanById(
      plan_id,
      connection
    );

    if (!plan) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "The selected subscription plan is unavailable.",
      });
    }

    // Create the 14-day trial subscription.
    const subscriptionId = await createBusinessSubscription(
      {
        business_id: businessId,
        plan_id: plan.id,
        billing_cycle,
      },
      connection
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Subscription plan selected successfully. Your 14-day free trial has started.",
      subscription: {
        id: subscriptionId,
        business_id: businessId,
        plan_id: plan.id,
        plan_name: plan.plan_name,
        billing_cycle,
        status: "trial",
        trial_days: 14,
      },
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Subscription rollback error:",
          rollbackError.message
        );
      }
    }

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "A subscription has already been created for this business.",
      });
    }

    console.error("Subscription plan selection error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to select subscription plan. Please try again.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Change the authenticated business's subscription plan.
export async function changeSubscriptionPlan(req, res) {
  let connection;

  try {
    const businessId = req.user?.business_id;
    const user = req.user;
    const { plan_id, billing_cycle = "monthly" } = req.body;

    if (!Number.isSafeInteger(businessId) || businessId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid business authentication.",
      });
    }

    if (!Number.isSafeInteger(plan_id) || plan_id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid subscription plan.",
      });
    }

    if (!["monthly", "annual"].includes(billing_cycle)) {
      return res.status(400).json({
        success: false,
        message: "Billing cycle must be monthly or annual.",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const currentSubscription =
      await getBusinessSubscriptionForUpdate(
        businessId,
        connection
      );

    if (!currentSubscription) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "No subscription was found for this business.",
      });
    }

    if (currentSubscription.pending_plan_id !== null) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message:
          "A subscription plan change is already scheduled. Please wait until it takes effect before requesting another change.",
      });
    }

    const targetPlan = await getActiveSubscriptionPlanById(
      plan_id,
      connection
    );

    if (!targetPlan) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "The selected subscription plan is unavailable.",
      });
    }

    // Avoid unnecessary changes.
    if (
      Number(currentSubscription.plan_id) === Number(targetPlan.id) &&
      currentSubscription.billing_cycle === billing_cycle
    ) {
      await connection.commit();

      return res.status(200).json({
        success: true,
        message: "Your business is already using this plan and billing cycle.",
        change_type: "no_change",
      });
    }

    const currentLevel = getSubscriptionPlanLevel(
      currentSubscription.plan_code
    );

    const targetLevel = getSubscriptionPlanLevel(
      targetPlan.plan_code
    );

    if (currentLevel === null || targetLevel === null) {
      throw new Error("An unsupported subscription plan was detected.");
    }

    // Check the employee limit before changing or scheduling a plan.
    const employeeCount = await countActiveBusinessEmployees(
      businessId,
      connection
    );

    if (
      targetPlan.max_employees !== null &&
      employeeCount > Number(targetPlan.max_employees)
    ) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message:
          `This plan allows ${targetPlan.max_employees} active employees, but your business currently has ${employeeCount}. Deactivate excess employee accounts before selecting this plan.`,
        employee_count: employeeCount,
        employee_limit: targetPlan.max_employees,
      });
    }

    // Higher-tier upgrades take effect immediately.
    if (targetLevel > currentLevel) {
      await updateBusinessSubscriptionPlan(
        currentSubscription.subscription_id,
        targetPlan.id,
        billing_cycle,
        connection
      );

      await createActivityLog(
        {
          business_id: businessId,
          user_id: user.id,
          employee_name: user.full_name,
          username: user.username,
          action: "SUBSCRIPTION_PLAN_UPGRADED",
          entity_type: "subscription",
          entity_id: currentSubscription.subscription_id,
          description:
            `Subscription upgraded from ${currentSubscription.plan_name} (${currentSubscription.billing_cycle}) to ${targetPlan.plan_name} (${billing_cycle}).`,
          ip_address: req.ip,
        },
        connection
      );

      await connection.commit();

      return res.status(200).json({
        success: true,
        message: "Your subscription upgrade has been applied successfully.",
        change_type: "immediate_upgrade",
        plan: targetPlan.plan_name,
        billing_cycle,
      });
    }

    // Downgrades and billing-cycle changes take effect
    // at the next subscription boundary.
    const scheduledDate =
      currentSubscription.scheduled_boundary_date;

    if (!scheduledDate) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message:
          "A billing or trial end date is unavailable. This change cannot be scheduled safely.",
      });
    }

    await scheduleBusinessSubscriptionPlanChange(
      currentSubscription.subscription_id,
      targetPlan.id,
      billing_cycle,
      scheduledDate,
      connection
    );

    const isDowngrade = targetLevel < currentLevel;

    await createActivityLog(
      {
        business_id: businessId,
        user_id: user.id,
        employee_name: user.full_name,
        username: user.username,
        action: isDowngrade
          ? "SUBSCRIPTION_PLAN_DOWNGRADE_SCHEDULED"
          : "SUBSCRIPTION_BILLING_CYCLE_CHANGE_SCHEDULED",
        entity_type: "subscription",
        entity_id: currentSubscription.subscription_id,
        description:
          `Subscription change from ${currentSubscription.plan_name} (${currentSubscription.billing_cycle}) to ${targetPlan.plan_name} (${billing_cycle}) scheduled for ${scheduledDate}.`,
        ip_address: req.ip,
      },
      connection
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: isDowngrade
        ? "Your plan downgrade has been scheduled successfully."
        : "Your billing-cycle change has been scheduled successfully.",
      change_type: isDowngrade
        ? "scheduled_downgrade"
        : "scheduled_billing_cycle_change",
      current_plan: currentSubscription.plan_name,
      pending_plan: targetPlan.plan_name,
      billing_cycle,
      scheduled_change_date: scheduledDate,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Subscription plan-change rollback error:",
          rollbackError.message
        );
      }
    }

    console.error(
      "Subscription plan-change error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Unable to change your subscription plan. Please try again.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}