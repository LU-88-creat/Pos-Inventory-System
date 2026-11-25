
import db from "../config/db.js";

const RETRYABLE_CONNECTION_ERRORS = new Set([
  "ECONNRESET",
  "PROTOCOL_CONNECTION_LOST",
  "ETIMEDOUT",
  "EPIPE",
]);

async function executeUserRead(sql, values) {
  try {
    return await db.execute(sql, values);
  } catch (error) {
    if (!RETRYABLE_CONNECTION_ERRORS.has(error.code)) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
    return db.execute(sql, values);
  }
}

// Find an employee account within a specific business.
// Find an employee account within a specific business.
export async function getUserByUsername(username, businessId) {
  const [rows] = await executeUserRead(
    `SELECT *
     FROM users
     WHERE username = ?
       AND business_id = ?
     LIMIT 1`,
    [username, businessId]
  );

  return rows[0] || null;
}


// Find an employee account using its email and business ID.
export async function getUserByEmail(email, businessId) {
  const [rows] = await executeUserRead(
    `SELECT
       id,
       business_id,
       full_name,
       email,
       is_active
     FROM users
     WHERE email = ?
       AND business_id = ?
     LIMIT 1`,
    [email, businessId]
  );

  return rows[0] || null;
}

// Find business administrators that can sign in using the business email.
export async function getAdministratorsByBusinessId(businessId) {
  const [rows] = await executeUserRead(
    `SELECT *
     FROM users
     WHERE business_id = ?
       AND role = 'administrator'
     ORDER BY id`,
    [businessId]
  );

  return rows;
}

export async function getUserById(id, businessId, connection = db) {
  const [rows] = await connection.execute(
    `SELECT
       id,
       business_id,
       full_name,
       username,
       email,
       role,
       is_active,
       created_at,
       updated_at
     FROM users
     WHERE id = ?
       AND business_id = ?
     LIMIT 1`,
    [id, businessId]
  );

  return rows[0] || null;
}

export async function createUser(userData, connection = db) {
  const {
    business_id,
    full_name,
    username,
    email,
    password_hash,
    role,
  } = userData;

  const [result] = await connection.execute(
    `INSERT INTO users (
       business_id,
       full_name,
       username,
       email,
       password_hash,
       role
     )
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      business_id,
      full_name,
      username,
      email || null,
      password_hash,
      role,
    ]
  );

  return getUserById(result.insertId, business_id, connection);
}

// Retrieve employee accounts belonging to a specific business.
export async function getAllUsers(businessId) {
  const [rows] = await db.execute(
    `SELECT
       id,
       business_id,
       full_name,
       username,
       email,
       role,
       is_active,
       created_at,
       updated_at
     FROM users
     WHERE business_id = ?
     ORDER BY created_at DESC`,
    [businessId]
  );

  return rows;
}


// Update an employee's status within a specific business.
export async function updateUserStatus(id, is_active, businessId) {
  await db.execute(
    `UPDATE users
     SET is_active = ?
     WHERE id = ?
       AND business_id = ?`,
    [is_active, id, businessId]
  );

  // Return the employee even if the status was already unchanged.
  return getUserById(id, businessId);
}


// Update an employee's name within a specific business.
export async function updateUserName(id, full_name, businessId) {
  const [result] = await db.execute(
    `UPDATE users
     SET full_name = ?
     WHERE id = ?
       AND business_id = ?`,
    [full_name, id, businessId]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getUserById(id, businessId);
}

// Delete an employee account belonging to a specific business.
export async function deleteUserById(id, businessId) {
  const [result] = await db.execute(
    `DELETE FROM users
     WHERE id = ?
       AND business_id = ?`,
    [id, businessId]
  );

  return result.affectedRows > 0;
}

// Retrieve an employee's password hash within a specific business.
export async function getUserPasswordHash(id, businessId) {
  const [rows] = await db.execute(
    `SELECT password_hash
     FROM users
     WHERE id = ?
       AND business_id = ?
     LIMIT 1`,
    [id, businessId]
  );

  return rows[0] || null;
}

// Update an employee's password within a specific business.
export async function updateUserPassword(id, password_hash, businessId) {
  const [result] = await db.execute(
    `UPDATE users
     SET password_hash = ?
     WHERE id = ?
       AND business_id = ?`,
    [password_hash, id, businessId]
  );

  return result.affectedRows > 0;
}

// Count active non-administrator employees in a business.
export async function countActiveEmployees(businessId) {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS total
     FROM users
     WHERE business_id = ?
       AND is_active = 1
       AND role != 'administrator'`,
    [businessId]
  );

  return Number(rows[0].total);
}