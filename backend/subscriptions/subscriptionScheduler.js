
import db from "../config/db.js";

import {
  getBusinessSubscriptionForUpdate,
  getActiveSubscriptionPlanById,
  countActiveBusinessEmployees,
  applyScheduledBusinessSubscriptionPlanChange,
} from "../models/subscriptionModel.js";

import { createActivityLog } from "../activityLogs/activityLogModel.js";

// Prevent overlapping scheduler executions.
let isRunning = false;

// Process subscription changes whose scheduled dates have arrived.
export async function processScheduledSubscriptionChanges() {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    // Find businesses with scheduled changes that are due.
    const [dueSubscriptions] = await db.execute(
      `SELECT DISTINCT business_id
       FROM business_subscriptions
       WHERE pending_plan_id IS NOT NULL
         AND scheduled_change_date IS NOT NULL
         AND scheduled_change_date <= CURRENT_DATE()`
    );

    for (const item of dueSubscriptions) {
      let connection;

      try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Lock and recheck the subscription.
        const subscription =
          await getBusinessSubscriptionForUpdate(
            item.business_id,
            connection
          );

        if (
          !subscription ||
          subscription.pending_plan_id === null ||
          !subscription.scheduled_change_date
        ) {
          await connection.rollback();
          continue;
        }

        // Confirm that the scheduled date has arrived.
        const [dateRows] = await connection.execute(
          `SELECT
             scheduled_change_date <= CURRENT_DATE() AS is_due
           FROM business_subscriptions
           WHERE id = ?
           LIMIT 1`,
          [subscription.subscription_id]
        );

        if (!dateRows[0]?.is_due) {
          await connection.rollback();
          continue;
        }

        // Confirm that the pending plan is still active.
        const targetPlan = await getActiveSubscriptionPlanById(
          subscription.pending_plan_id,
          connection
        );

        if (!targetPlan) {
          await connection.rollback();

          console.error(
            `Scheduled subscription change skipped for business ${item.business_id}: pending plan is no longer active.`
          );

          continue;
        }

        // Recheck the employee limit before applying the change.
        const employeeCount = await countActiveBusinessEmployees(
          item.business_id,
          connection
        );

        if (
          targetPlan.max_employees !== null &&
          employeeCount > Number(targetPlan.max_employees)
        ) {
          await connection.rollback();

          console.warn(
            `Scheduled subscription change postponed for business ${item.business_id}: ${employeeCount} active employees exceed the ${targetPlan.max_employees} employee limit.`
          );

          continue;
        }

        // Apply the scheduled plan change.
        const updateResult =
          await applyScheduledBusinessSubscriptionPlanChange(
            subscription.subscription_id,
            connection
          );

        if (updateResult !== 1) {
          await connection.rollback();

          console.warn(
            `Scheduled subscription change was not applied for business ${item.business_id}.`
          );

          continue;
        }

        // Record the completed change in the same transaction.
        await createActivityLog(
          {
            business_id: item.business_id,
            action: "SUBSCRIPTION_PLAN_CHANGE_APPLIED",
            entity_type: "subscription",
            entity_id: subscription.subscription_id,
            description:
              `Scheduled subscription change applied. New plan: ${targetPlan.plan_name} (${subscription.pending_billing_cycle}).`,
          },
          connection
        );

        await connection.commit();

        console.log(
          `Scheduled subscription change applied for business ${item.business_id}.`
        );
      } catch (error) {
        if (connection) {
          try {
            await connection.rollback();
          } catch (rollbackError) {
            console.error(
              "Subscription scheduler rollback error:",
              rollbackError.message
            );
          }
        }

        console.error(
          `Subscription scheduler error for business ${item.business_id}:`,
          error.message
        );
      } finally {
        if (connection) {
          connection.release();
        }
      }
    }
  } catch (error) {
    console.error(
      "Retrieve scheduled subscription changes error:",
      error.message
    );
  } finally {
    isRunning = false;
  }
}
