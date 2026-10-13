
import db from "../../config/db.js";

export async function getAllProducts({ search = "", categoryId = "" } = {}) {
  let sql = `
    SELECT
      p.id,
      p.product_name,
      p.sku,
      p.barcode,
      p.category_id,
      c.category_name,
      p.unit_of_measure,
      p.cost_price,
      p.selling_price,
      p.stock_quantity,
      p.reorder_level,
      p.is_active,
      p.created_at,
      p.updated_at
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
    WHERE 1 = 1
  `;

  const params = [];

  if (search.trim()) {
    sql += `
      AND (
        p.product_name LIKE ?
        OR p.sku LIKE ?
        OR p.barcode LIKE ?
      )
    `;

    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  if (categoryId !== "") {
    sql += " AND p.category_id = ?";
    params.push(categoryId);
  }

  sql += " ORDER BY p.id DESC";

  const [rows] = await db.query(sql, params);
  return rows;
}

export async function getProductById(id) {
  const [rows] = await db.query(
    `SELECT p.*, c.category_name
     FROM products p
     INNER JOIN categories c ON c.id = p.category_id
     WHERE p.id = ?`,
    [id]
  );

  return rows[0] || null;
}

export async function createProduct(product) {
  const {
    product_name,
    sku,
    barcode,
    category_id,
    unit_of_measure,
    cost_price,
    selling_price,
    stock_quantity,
    reorder_level,
  } = product;

  const [result] = await db.query(
    `INSERT INTO products (
      product_name, sku, barcode, category_id,
      unit_of_measure, cost_price, selling_price,
      stock_quantity, reorder_level
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      product_name,
      sku,
      barcode || null,
      category_id,
      unit_of_measure,
      cost_price,
      selling_price,
      stock_quantity,
      reorder_level,
    ]
  );

  return getProductById(result.insertId);
}

export async function updateProduct(id, product) {
  const {
    product_name,
    sku,
    barcode,
    category_id,
    unit_of_measure,
    cost_price,
    selling_price,
    stock_quantity,
    reorder_level,
  } = product;

  const [result] = await db.query(
    `UPDATE products SET
      product_name = ?,
      sku = ?,
      barcode = ?,
      category_id = ?,
      unit_of_measure = ?,
      cost_price = ?,
      selling_price = ?,
      stock_quantity = ?,
      reorder_level = ?
     WHERE id = ?`,
    [
      product_name,
      sku,
      barcode || null,
      category_id,
      unit_of_measure,
      cost_price,
      selling_price,
      stock_quantity,
      reorder_level,
      id,
    ]
  );

  if (result.affectedRows === 0) {
    const existing = await getProductById(id);
    return existing;
  }

  return getProductById(id);
}

export async function updateProductStatus(id, is_active) {
  const [result] = await db.query(
    "UPDATE products SET is_active = ? WHERE id = ?",
    [is_active, id]
  );

  if (result.affectedRows === 0) {
    return getProductById(id);
  }

  return getProductById(id);
}

export async function deleteProduct(id) {
  const [result] = await db.query(
    "UPDATE products SET is_active = FALSE WHERE id = ?",
    [id]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getProductById(id);
}