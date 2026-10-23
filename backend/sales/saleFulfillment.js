import { createStockMovement } from "../stock/stockModel.js";

export async function fulfillSale(connection, saleId, sale) {
  if (sale.payment_status === "completed") {
    return;
  }

  if (sale.payment_status !== "pending") {
    const error = new Error("This sale is not pending and cannot be completed.");
    error.statusCode = 409;
    throw error;
  }

  const [items] = await connection.execute(
    `SELECT product_id, quantity
     FROM sale_items
     WHERE sale_id = ?
     ORDER BY id ASC`,
    [saleId]
  );

  if (items.length === 0) {
    const error = new Error("Cannot complete a sale without items.");
    error.statusCode = 400;
    throw error;
  }

  for (const item of items) {
    const quantity = Number(item.quantity);
    const [products] = await connection.execute(
      `SELECT id, product_name, stock_quantity
       FROM products
       WHERE id = ? AND is_active = TRUE
       FOR UPDATE`,
      [item.product_id]
    );

    if (products.length === 0) {
      const error = new Error(
        `Product ID ${item.product_id} was not found or is inactive.`
      );
      error.statusCode = 409;
      throw error;
    }

    const product = products[0];
    const previousStock = Number(product.stock_quantity);

    if (previousStock < quantity) {
      const error = new Error(
        `Insufficient stock for ${product.product_name}.`
      );
      error.statusCode = 409;
      throw error;
    }

    const newStock = Number((previousStock - quantity).toFixed(3));
    const [result] = await connection.execute(
      `UPDATE products
       SET stock_quantity = ?
       WHERE id = ? AND stock_quantity >= ?`,
      [newStock, product.id, quantity]
    );

    if (result.affectedRows !== 1) {
      const error = new Error(
        `Stock update failed for ${product.product_name}.`
      );
      error.statusCode = 409;
      throw error;
    }

    await createStockMovement(connection, {
      product_id: product.id,
      movement_type: "sale",
      quantity,
      previous_stock: previousStock,
      new_stock: newStock,
      reference_type: "sale",
      reference_id: saleId,
      notes: `Stock deducted for receipt ${saleId}`,
    });
  }

  await connection.execute(
    `UPDATE sales
     SET payment_status = 'completed'
     WHERE id = ? AND payment_status = 'pending'`,
    [saleId]
  );
}
