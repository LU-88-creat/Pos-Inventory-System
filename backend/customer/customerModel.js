
import db from "../config/db.js";

// Get all active customers, with optional search
export async function getAllCustomers({ search = "" } = {}) {
  const sql = `
    SELECT
      id,
      customer_name,
      phone,
      email,
      address,
      is_active,
      created_at,
      updated_at
    FROM customers
    WHERE is_active = TRUE
      AND (
        customer_name LIKE ?
        OR phone LIKE ?
        OR email LIKE ?
      )
    ORDER BY id DESC
  `;

  const searchTerm = `%${search}%`;

  const [rows] = await db.execute(sql, [
    searchTerm,
    searchTerm,
    searchTerm,
  ]);

  return rows;
}

// Get one customer by ID
export async function getCustomerById(id) {
  const sql = `
    SELECT
      id,
      customer_name,
      phone,
      email,
      address,
      is_active,
      created_at,
      updated_at
    FROM customers
    WHERE id = ?
    LIMIT 1
  `;

  const [rows] = await db.execute(sql, [id]);

  return rows[0] || null;
}

// Create a customer
export async function createCustomer(customer) {
  const {
    customer_name,
    phone = null,
    email = null,
    address = null,
  } = customer;

  const sql = `
    INSERT INTO customers (
      customer_name,
      phone,
      email,
      address
    )
    VALUES (?, ?, ?, ?)
  `;

  const [result] = await db.execute(sql, [
    customer_name,
    phone || null,
    email || null,
    address || null,
  ]);

  return getCustomerById(result.insertId);
}

// Update a customer
export async function updateCustomer(id, customer) {
  const {
    customer_name,
    phone = null,
    email = null,
    address = null,
  } = customer;

  const sql = `
    UPDATE customers
    SET
      customer_name = ?,
      phone = ?,
      email = ?,
      address = ?
    WHERE id = ?
      AND is_active = TRUE
  `;

  const [result] = await db.execute(sql, [
    customer_name,
    phone || null,
    email || null,
    address || null,
    id,
  ]);

  if (result.affectedRows === 0) {
    return null;
  }

  return getCustomerById(id);
}

// Deactivate a customer without permanently deleting the record
export async function deactivateCustomer(id) {
  const sql = `
    UPDATE customers
    SET is_active = FALSE
    WHERE id = ?
      AND is_active = TRUE
  `;

  const [result] = await db.execute(sql, [id]);

  return result.affectedRows > 0;
}
