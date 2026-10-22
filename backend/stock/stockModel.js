
import db from "../config/db.js";

// Lock and retrieve an active product before changing its stock.
export async function getProductForUpdate(connection, productId) {
  const [rows] = await connection.execute(
    `SELECT id, product_name, sku, stock_quantity, reorder_level
     FROM products
     WHERE id = ? AND is_active = TRUE
     FOR UPDATE`,
    [productId]
  );

  return rows.length ? rows[0] : null;
}

// Update the current stock quantity.
export async function updateProductStock(
  connection,
  productId,
  newStock
) {
  const [result] = await connection.execute(
    `UPDATE products
     SET stock_quantity = ?
     WHERE id = ?`,
    [newStock, productId]
  );

  if (result.affectedRows !== 1) {
    throw new Error("Failed to update product stock.");
  }
}

// Record a stock movement using the same transaction connection.
export async function createStockMovement(connection, movement) {
  const {
    product_id,
    movement_type,
    quantity,
    previous_stock,
    new_stock,
    reference_type = null,
    reference_id = null,
    notes = null,
  } = movement;

  const [result] = await connection.execute(
    `INSERT INTO stock_movements (
      product_id,
      movement_type,
      quantity,
      previous_stock,
      new_stock,
      reference_type,
      reference_id,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
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

// Retrieve recent stock movements, optionally for one product.
export async function getStockMovements({
  productId = null,
  limit = 100,
} = {}) {
  const params = [];
  let whereClause = "";

  if (productId !== null) {
    whereClause = "WHERE sm.product_id = ?";
    params.push(productId);
  }

  params.push(limit);

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
     INNER JOIN products p ON p.id = sm.product_id
     ${whereClause}
     ORDER BY sm.created_at DESC, sm.id DESC
     LIMIT ?`,
    params
  );

  return rows;
}
