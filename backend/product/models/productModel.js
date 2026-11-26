
import db from "../../config/db.js";

// Retrieve products belonging to a specific business.
export async function getAllProducts(
  businessId,
  { search = "", categoryId = "" } = {}
) {
  let sql = `
    SELECT
      p.id,
      p.business_id,
      p.product_name,
      p.sku,
      p.barcode,
      p.category_id,
      c.category_name,
      p.unit_of_measure,
      p.cost_price,
      p.selling_price,
      p.tax_rate,
      p.discount_rate,
      p.stock_quantity,
      p.reorder_level,
      p.is_active,
      p.created_at,
      p.updated_at
    FROM products p
    INNER JOIN categories c
      ON c.id = p.category_id
      AND c.business_id = p.business_id
    WHERE p.business_id = ?
      AND p.is_active = TRUE
  `;

  const params = [businessId];

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

// Retrieve one product belonging to a specific business.
export async function getProductById(id, businessId) {
  const [rows] = await db.query(
    `SELECT
       p.*,
       c.category_name
     FROM products p
     INNER JOIN categories c
       ON c.id = p.category_id
       AND c.business_id = p.business_id
     WHERE p.id = ?
       AND p.business_id = ?
     LIMIT 1`,
    [id, businessId]
  );

  return rows[0] || null;
}

// Create a product for a specific business.
export async function createProduct(product, businessId) {
  const {
    product_name,
    sku,
    barcode,
    category_id,
    unit_of_measure,
    cost_price,
    selling_price,
    tax_rate,
    discount_rate,
    stock_quantity,
    reorder_level,
  } = product;

  // Confirm that the category belongs to this business.
  const [categories] = await db.query(
    `SELECT id
     FROM categories
     WHERE id = ?
       AND business_id = ?
       AND is_active = TRUE
     LIMIT 1`,
    [category_id, businessId]
  );

  if (categories.length === 0) {
    const error = new Error(
      "The selected category does not belong to this business."
    );
    error.code = "INVALID_BUSINESS_CATEGORY";
    throw error;
  }

  const [result] = await db.query(
    `INSERT INTO products (
      business_id,
      product_name,
      sku,
      barcode,
      category_id,
      unit_of_measure,
      cost_price,
      selling_price,
      tax_rate,
      discount_rate,
      stock_quantity,
      reorder_level
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      businessId,
      product_name,
      sku,
      barcode || null,
      category_id,
      unit_of_measure,
      cost_price,
      selling_price,
      tax_rate,
      discount_rate,
      stock_quantity,
      reorder_level,
    ]
  );

  return getProductById(result.insertId, businessId);
}

// Update a product only within its owning business.
export async function updateProduct(id, product, businessId) {
  const {
    product_name,
    sku,
    barcode,
    category_id,
    unit_of_measure,
    cost_price,
    selling_price,
    tax_rate,
    discount_rate,
    stock_quantity,
    reorder_level,
  } = product;

  const [categories] = await db.query(
    `SELECT id
     FROM categories
     WHERE id = ?
       AND business_id = ?
       AND is_active = TRUE
     LIMIT 1`,
    [category_id, businessId]
  );

  if (categories.length === 0) {
    const error = new Error(
      "The selected category does not belong to this business."
    );
    error.code = "INVALID_BUSINESS_CATEGORY";
    throw error;
  }

  const [result] = await db.query(
    `UPDATE products SET
      product_name = ?,
      sku = ?,
      barcode = ?,
      category_id = ?,
      unit_of_measure = ?,
      cost_price = ?,
      selling_price = ?,
      tax_rate = ?,
      discount_rate = ?,
      stock_quantity = ?,
      reorder_level = ?
     WHERE id = ?
       AND business_id = ?`,
    [
      product_name,
      sku,
      barcode || null,
      category_id,
      unit_of_measure,
      cost_price,
      selling_price,
      tax_rate,
      discount_rate,
      stock_quantity,
      reorder_level,
      id,
      businessId,
    ]
  );

  if (result.affectedRows === 0) {
    return getProductById(id, businessId);
  }

  return getProductById(id, businessId);
}

// Change product status only within its owning business.
export async function updateProductStatus(id, is_active, businessId) {
  const [result] = await db.query(
    `UPDATE products
     SET is_active = ?
     WHERE id = ?
       AND business_id = ?`,
    [is_active, id, businessId]
  );

  if (result.affectedRows === 0) {
    return getProductById(id, businessId);
  }

  return getProductById(id, businessId);
}

// Soft-delete a product only within its owning business.
export async function deleteProduct(id, businessId) {
  const [result] = await db.query(
    `UPDATE products
     SET is_active = FALSE
     WHERE id = ?
       AND business_id = ?`,
    [id, businessId]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getProductById(id, businessId);
}
