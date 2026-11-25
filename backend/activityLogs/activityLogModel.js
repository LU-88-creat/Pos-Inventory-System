
import db from "../config/db.js";

// Record an employee activity.
export async function createActivityLog({
  business_id,
  user_id = null,
  employee_name = null,
  username = null,
  action,
  entity_type = null,
  entity_id = null,
  description = null,
  ip_address = null,
}, connection = db) {
  let result;

  try {
    [result] = await connection.execute(
      `INSERT INTO activity_logs (
        business_id,
        user_id,
        employee_name,
        username,
        action,
        entity_type,
        entity_id,
        description,
        ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        business_id,
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
  } catch (error) {
    if (error.code !== "ER_BAD_FIELD_ERROR") {
      throw error;
    }

    [result] = await connection.execute(
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
  }

  return result.insertId;
}
