
import db from "../config/db.js";

// Find an employee account using their username.
export async function getUserByUsername(username) {
  const [rows] = await db.execute(
    `SELECT *
     FROM users
     WHERE username = ?
     LIMIT 1`,
    [username]
  );

  return rows[0] || null;
}

// Find an employee account using its ID.
export async function getUserById(id) {
  const [rows] = await db.execute(
    `SELECT
       id,
       full_name,
       username,
       email,
       role,
       is_active,
       created_at,
       updated_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

// Create a new employee account.
export async function createUser(userData) {
  const {
    full_name,
    username,
    email,
    password_hash,
    role,
  } = userData;

  const [result] = await db.execute(
    `INSERT INTO users (
       full_name,
       username,
       email,
       password_hash,
       role
     )
     VALUES (?, ?, ?, ?, ?)`,
    [
      full_name,
      username,
      email || null,
      password_hash,
      role,
    ]
  );

  return getUserById(result.insertId);
}

// Retrieve all employee accounts.
export async function getAllUsers() {
  const [rows] = await db.execute(
    `SELECT
       id,
       full_name,
       username,
       email,
       role,
       is_active,
       created_at,
       updated_at
     FROM users
     ORDER BY created_at DESC`
  );

  return rows;
}

export async function updateUserStatus(id, is_active) {
  const [result] = await db.execute(
    `UPDATE users
     SET is_active = ?
     WHERE id = ?`,
    [is_active, id]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getUserById(id);
}
