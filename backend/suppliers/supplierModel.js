
import db from "../config/db.js";

// Retrieve suppliers belonging only to this business.
export async function getAllSuppliers(
  businessId,
  { search = "", status = "all" } = {}
) {
  let sql = `
    SELECT
      id,
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      tax_number,
      notes,
      is_active,
      created_at,
      updated_at
    FROM suppliers
    WHERE business_id = ?
  `;

  const params = [businessId];

  if (search.trim()) {
    sql += `
      AND (
        supplier_name LIKE ?
        OR contact_person LIKE ?
        OR phone LIKE ?
        OR email LIKE ?
      )
    `;

    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  if (status === "active") {
    sql += " AND is_active = 1";
  } else if (status === "inactive") {
    sql += " AND is_active = 0";
  }

  sql += " ORDER BY supplier_name ASC";

  const [rows] = await db.execute(sql, params);
  return rows;
}

// Retrieve one supplier belonging to this business.
export async function getSupplierById(id, businessId) {
  const [rows] = await db.execute(
    `SELECT *
     FROM suppliers
     WHERE id = ? AND business_id = ?
     LIMIT 1`,
    [id, businessId]
  );

  return rows[0] || null;
}

// Create a supplier under the authenticated business.
export async function createSupplier(supplier, businessId) {
  const {
    supplier_name,
    contact_person = null,
    phone = null,
    email = null,
    address = null,
    tax_number = null,
    notes = null,
  } = supplier;

  const [result] = await db.execute(
    `INSERT INTO suppliers (
      business_id,
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      tax_number,
      notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      businessId,
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      tax_number,
      notes,
    ]
  );

  return getSupplierById(result.insertId, businessId);
}

// Update only a supplier belonging to this business.
export async function updateSupplier(id, supplier, businessId) {
  const {
    supplier_name,
    contact_person = null,
    phone = null,
    email = null,
    address = null,
    tax_number = null,
    notes = null,
  } = supplier;

  const [result] = await db.execute(
    `UPDATE suppliers
     SET supplier_name = ?,
         contact_person = ?,
         phone = ?,
         email = ?,
         address = ?,
         tax_number = ?,
         notes = ?
     WHERE id = ? AND business_id = ?`,
    [
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      tax_number,
      notes,
      id,
      businessId,
    ]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getSupplierById(id, businessId);
}

// Change status only for a supplier belonging to this business.
export async function setSupplierStatus(id, is_active, businessId) {
  const [result] = await db.execute(
    `UPDATE suppliers
     SET is_active = ?
     WHERE id = ? AND business_id = ?`,
    [is_active, id, businessId]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getSupplierById(id, businessId);
}
