
import db from "../config/db.js";

// Retrieve the current subscription and plan for a business.
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
       END AS has_access
     FROM business_subscriptions bs
     INNER JOIN subscription_plans sp
       ON sp.id = bs.plan_id
     WHERE bs.active_business_id = ?
     LIMIT 1`,
    [businessId]
  );

  return rows[0] || null;
}
