
import db from "../config/db.js";


// Retrieve the current subscription, plan, and enabled features for a business.
export async function getBusinessSubscription(businessId) {
  const [rows] = await db.execute(
    `SELECT
       bs.id AS subscription_id,
       bs.business_id,
       bs.plan_id,
       bs.status,
       bs.billing_cycle,
       bs.start_date,
       bs.trial_ends_at,
       bs.current_period_start,
       bs.current_period_end,
       bs.grace_period_ends_at,
       sp.plan_code,
       sp.plan_name,
       sp.max_employees,
       bs.pending_plan_id,
       bs.pending_billing_cycle,
       bs.scheduled_change_date,
       pending_sp.plan_name AS pending_plan_name,
       CASE
         WHEN bs.status = 'active'
           AND (
             bs.current_period_end IS NULL
             OR bs.current_period_end >= CURRENT_DATE()
           )
           THEN 1

         WHEN bs.status = 'trial'
           AND bs.trial_ends_at IS NOT NULL
           AND bs.trial_ends_at >= CURRENT_TIMESTAMP
           THEN 1

         WHEN bs.status = 'past_due'
           AND bs.grace_period_ends_at IS NOT NULL
           AND bs.grace_period_ends_at >= CURRENT_TIMESTAMP
           THEN 1

         ELSE 0
       END AS has_access,
       COALESCE(
         (
           SELECT JSON_ARRAYAGG(spf.feature_code)
           FROM subscription_plan_features spf
           WHERE spf.plan_id = bs.plan_id
             AND spf.is_enabled = 1
         ),
         JSON_ARRAY()
       ) AS enabled_features
     FROM business_subscriptions bs
     INNER JOIN subscription_plans sp
       ON sp.id = bs.plan_id
     LEFT JOIN subscription_plans pending_sp
       ON pending_sp.id = bs.pending_plan_id
     WHERE bs.active_business_id = ?
     LIMIT 1`,
    [businessId]
  );

  const subscription = rows[0] || null;

  if (!subscription) {
    return null;
  }

  if (typeof subscription.enabled_features === "string") {
    subscription.enabled_features = JSON.parse(
      subscription.enabled_features
    );
  }

  return subscription;
}


// Retrieve all active subscription plans with their configured features.
export async function getActiveSubscriptionPlans(connection = db) {
  const [rows] = await connection.execute(
    `SELECT
       sp.id,
       sp.plan_code,
       sp.plan_name,
       sp.description,
       sp.monthly_price,
       sp.annual_price,
       sp.currency,
       sp.max_employees,
       spf.feature_code,
       spf.feature_name,
       spf.is_enabled
     FROM subscription_plans sp
     LEFT JOIN subscription_plan_features spf
       ON spf.plan_id = sp.id
     WHERE sp.is_active = 1
     ORDER BY sp.id ASC, spf.id ASC`
  );

  const plans = new Map();

  for (const row of rows) {
    if (!plans.has(row.id)) {
      plans.set(row.id, {
        id: row.id,
        plan_code: row.plan_code,
        plan_name: row.plan_name,
        description: row.description,
        monthly_price: row.monthly_price,
        annual_price: row.annual_price,
        currency: row.currency,
        max_employees: row.max_employees,
        features: [],
      });
    }

    if (row.feature_code) {
      plans.get(row.id).features.push({
        feature_code: row.feature_code,
        feature_name: row.feature_name,
        is_enabled: row.is_enabled,
      });
    }
  }

  return Array.from(plans.values());
}

// Retrieve one active subscription plan by ID.
export async function getActiveSubscriptionPlanById(
  planId,
  connection = db
) {
  const [rows] = await connection.execute(
    `SELECT
       id,
       plan_code,
       plan_name,
       description,
       monthly_price,
       annual_price,
       currency,
       max_employees
     FROM subscription_plans
     WHERE id = ?
       AND is_active = 1
     LIMIT 1`,
    [planId]
  );

  return rows[0] || null;
}


// Create an initial subscription for a newly registered business.
export async function createBusinessSubscription(
  {
    business_id,
    plan_id,
    billing_cycle = "monthly",
  },
  connection = db
) {
  const [result] = await connection.execute(
    `INSERT INTO business_subscriptions (
       business_id,
       active_business_id,
       plan_id,
       billing_cycle,
       status,
       start_date,
       trial_ends_at
     )
     VALUES (
       ?, ?, ?, ?, 'trial',
       CURRENT_DATE(),
       DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 14 DAY)
     )`,
    [
      business_id,
      business_id,
      plan_id,
      billing_cycle,
    ]
  );

  return result.insertId;
}

// Retrieve a business subscription and lock it during a transaction.
export async function getBusinessSubscriptionForUpdate(
  businessId,
  connection
) {
  const [rows] = await connection.execute(
    `SELECT
       bs.id AS subscription_id,
       bs.business_id,
       bs.plan_id,
       bs.billing_cycle,
       bs.status,
       bs.trial_ends_at,
       bs.current_period_end,
       DATE_FORMAT(
        CASE
          WHEN bs.status = 'trial' THEN bs.trial_ends_at
          ELSE bs.current_period_end
        END,
        '%Y-%m-%d'
      ) AS scheduled_boundary_date,
       bs.pending_plan_id,
       bs.pending_billing_cycle,
       bs.scheduled_change_date,
       sp.plan_code,
       sp.plan_name,
       sp.max_employees
     FROM business_subscriptions bs
     INNER JOIN subscription_plans sp
       ON sp.id = bs.plan_id
     WHERE bs.active_business_id = ?
     LIMIT 1
     FOR UPDATE`,
    [businessId]
  );

  return rows[0] || null;
}

// Count active employees belonging to a business.
export async function countActiveBusinessEmployees(
  businessId,
  connection
) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS employee_count
     FROM users
     WHERE business_id = ?
       AND is_active = 1`,
    [businessId]
  );

  return Number(rows[0].employee_count);
}

// Compare subscription plan levels.
export function getSubscriptionPlanLevel(planCode) {
  const planLevels = {
    STARTER: 1,
    BUSINESS: 2,
    ENTERPRISE: 3,
  };

  return planLevels[planCode] ?? null;
}

// Apply an immediate subscription plan change.
export async function updateBusinessSubscriptionPlan(
  subscriptionId,
  planId,
  billingCycle,
  connection
) {
  const [result] = await connection.execute(
    `UPDATE business_subscriptions
     SET
       plan_id = ?,
       billing_cycle = ?,
       pending_plan_id = NULL,
       pending_billing_cycle = NULL,
       scheduled_change_date = NULL,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      planId,
      billingCycle,
      subscriptionId,
    ]
  );

  return result.affectedRows;
}

// Schedule a subscription downgrade for the next billing boundary.
export async function scheduleBusinessSubscriptionPlanChange(
  subscriptionId,
  planId,
  billingCycle,
  scheduledChangeDate,
  connection
) {
  const [result] = await connection.execute(
    `UPDATE business_subscriptions
     SET
       pending_plan_id = ?,
       pending_billing_cycle = ?,
       scheduled_change_date = ?,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      planId,
      billingCycle,
      scheduledChangeDate,
      subscriptionId,
    ]
  );

  return result.affectedRows;
}

// Apply a scheduled subscription plan change.
export async function applyScheduledBusinessSubscriptionPlanChange(
  subscriptionId,
  connection
) {
  const [result] = await connection.execute(
    `UPDATE business_subscriptions
     SET
       plan_id = pending_plan_id,
       billing_cycle = pending_billing_cycle,
       pending_plan_id = NULL,
       pending_billing_cycle = NULL,
       scheduled_change_date = NULL,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ?
       AND pending_plan_id IS NOT NULL
       AND scheduled_change_date IS NOT NULL
       AND scheduled_change_date <= CURRENT_DATE()`,
    [subscriptionId]
  );

  return result.affectedRows;
}