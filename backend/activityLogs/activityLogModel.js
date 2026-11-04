import db from "../config/db.js";

// Record an employee activity.
export async function createActivityLog({
  user_id = null,
  employee_name = null,
  username = null,
  action,
  entity_type = null,
  entity_id = null,
  description = null,
  ip_address = null,
}) {
  const [result] = await db.execute(
    `INSERT INTO activity_logs (
      user_id,
      employee_name,
      username,
      action,
      entity_type,
      entity_id,
      description,
      ip_address
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user_id,
      employee_name,
      username,
      action,
      entity_type,
      entity_id,
      description,
      ip_address,
    ]
  );

  return result.insertId;
}