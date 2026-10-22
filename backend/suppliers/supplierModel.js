
import db from "../config/db.js";

export async function getAllSuppliers({ search = "", status = "all" } = {}) {
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
    WHERE 1 = 1
  `;

  const params = [];

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

export async function getSupplierById(id) {
  const [rows] = await db.execute(
    "SELECT * FROM suppliers WHERE id = ? LIMIT 1",
    [id]
  );

  return rows[0] || null;
}

export async function createSupplier(supplier) {
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
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      tax_number,
      notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      tax_number,
      notes,
    ]
  );

  return getSupplierById(result.insertId);
}

export async function updateSupplier(id, supplier) {
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
     WHERE id = ?`,
    [
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      tax_number,
      notes,
      id,
    ]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getSupplierById(id);
}

export async function setSupplierStatus(id, is_active) {
  const [result] = await db.execute(
    "UPDATE suppliers SET is_active = ? WHERE id = ?",
    [is_active, id]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getSupplierById(id);
}
