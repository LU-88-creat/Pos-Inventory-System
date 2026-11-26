
import db from "../config/db.js";

// Get active customers belonging to a specific business.
export async function getAllCustomers(
  businessId,
  { search = "" } = {}
) {
  const sql = `
    SELECT
      id,
      business_id,
      customer_name,
      phone,
      email,
      address,
      is_active,
      created_at,
      updated_at
    FROM customers
    WHERE business_id = ?
      AND is_active = TRUE
      AND (
        customer_name LIKE ?
        OR phone LIKE ?
        OR email LIKE ?
      )
    ORDER BY id DESC
  `;

  const searchTerm = `%${search}%`;

  const [rows] = await db.execute(sql, [
    businessId,
    searchTerm,
    searchTerm,
    searchTerm,
  ]);

  return rows;
}

// Get one customer belonging to a specific business.
export async function getCustomerById(id, businessId) {
  const sql = `
    SELECT
      id,
      business_id,
      customer_name,
      phone,
      email,
      address,
      is_active,
      created_at,
      updated_at
    FROM customers
    WHERE id = ?
      AND business_id = ?
    LIMIT 1
  `;

  const [rows] = await db.execute(sql, [id, businessId]);

  return rows[0] || null;
}

// Create a customer for a specific business.
export async function createCustomer(customer, businessId) {
  const {
    customer_name,
    phone = null,
    email = null,
    address = null,
  } = customer;

  const sql = `
    INSERT INTO customers (
      business_id,
      customer_name,
      phone,
      email,
      address
    )
    VALUES (?, ?, ?, ?, ?)
  `;

  const [result] = await db.execute(sql, [
    businessId,
    customer_name,
    phone || null,
    email || null,
    address || null,
  ]);

  return getCustomerById(result.insertId, businessId);
}

// Update a customer only within its owning business.
export async function updateCustomer(id, customer, businessId) {
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
      AND business_id = ?
      AND is_active = TRUE
  `;

  const [result] = await db.execute(sql, [
    customer_name,
    phone || null,
    email || null,
    address || null,
    id,
    businessId,
  ]);

  if (result.affectedRows === 0) {
    return null;
  }

  return getCustomerById(id, businessId);
}

// Deactivate a customer only within its owning business.
export async function deactivateCustomer(id, businessId) {
  const sql = `
    UPDATE customers
    SET is_active = FALSE
    WHERE id = ?
      AND business_id = ?
      AND is_active = TRUE
  `;

  const [result] = await db.execute(sql, [id, businessId]);

  return result.affectedRows > 0;
}
