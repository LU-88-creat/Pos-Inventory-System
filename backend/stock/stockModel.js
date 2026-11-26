
import db from "../config/db.js";

// Lock and retrieve an active product belonging to this business.
export async function getProductForUpdate(
  connection,
  productId,
  businessId
) {
  const [rows] = await connection.execute(
    `SELECT id, product_name, sku, stock_quantity, reorder_level
     FROM products
     WHERE id = ?
       AND business_id = ?
       AND is_active = TRUE
     FOR UPDATE`,
    [productId, businessId]
  );

  return rows.length ? rows[0] : null;
}

// Update stock only when the product belongs to this business.
export async function updateProductStock(
  connection,
  productId,
  newStock,
  businessId
) {
  const [result] = await connection.execute(
    `UPDATE products
     SET stock_quantity = ?
     WHERE id = ?
       AND business_id = ?`,
    [newStock, productId, businessId]
  );

  if (result.affectedRows !== 1) {
    throw new Error("Failed to update product stock.");
  }
}

// Record a stock movement using the same transaction connection.
// Confirm that the product belongs to the supplied business.
export async function createStockMovement(connection, movement) {
  const {
    business_id,
    product_id,
    movement_type,
    quantity,
    previous_stock,
    new_stock,
    reference_type = null,
    reference_id = null,
    notes = null,
  } = movement;

  const [products] = await connection.execute(
    `SELECT id
     FROM products
     WHERE id = ?
       AND business_id = ?
     FOR UPDATE`,
    [product_id, business_id]
  );

  if (!products.length) {
    throw new Error("Product does not belong to this business.");
  }

  const [result] = await connection.execute(
    `INSERT INTO stock_movements (
      business_id,
      product_id,
      movement_type,
      quantity,
      previous_stock,
      new_stock,
      reference_type,
      reference_id,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      business_id,
      product_id,
      movement_type,
      quantity,
      previous_stock,
      new_stock,
      reference_type,
      reference_id,
      notes,
    ]
  );

  return result.insertId;
}

// Retrieve recent stock movements for one business,
// optionally filtered by product.
export async function getStockMovements({
  businessId,
  productId = null,
  limit = 100,
} = {}) {
  if (!Number.isSafeInteger(businessId) || businessId < 1) {
    throw new TypeError("A valid business ID is required.");
  }

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
    throw new RangeError("Stock movement limit must be between 1 and 500.");
  }

  const params = [businessId];
  let whereClause = "WHERE sm.business_id = ?";

  if (productId !== null) {
    whereClause += " AND sm.product_id = ?";
    params.push(productId);
  }

  const [rows] = await db.execute(
    `SELECT
       sm.id,
       sm.product_id,
       p.product_name,
       p.sku,
       sm.movement_type,
       sm.quantity,
       sm.previous_stock,
       sm.new_stock,
       sm.reference_type,
       sm.reference_id,
       sm.notes,
       sm.created_at
     FROM stock_movements sm
     INNER JOIN products p
       ON p.id = sm.product_id
       AND p.business_id = sm.business_id
     ${whereClause}
     ORDER BY sm.created_at DESC, sm.id DESC
     LIMIT ${limit}`,
    params
  );

  return rows;
}
