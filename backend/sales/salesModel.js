
import db from "../config/db.js";

export async function createSale(connection, saleData) {
  const {
    receipt_number,
    subtotal,
    discount_amount = 0,
    tax_amount = 0,
    total_amount,
    payment_method,
    payment_status = "pending",
    customer_id = null,
    cashier_name = null,
    notes = null,
  } = saleData;

  const sql = `
    INSERT INTO sales (
      receipt_number,
      subtotal,
      discount_amount,
      tax_amount,
      total_amount,
      payment_method,
      payment_status,
      customer_id,
      cashier_name,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await connection.execute(sql, [
    receipt_number,
    subtotal,
    discount_amount,
    tax_amount,
    total_amount,
    payment_method,
    payment_status,
    customer_id,
    cashier_name,
    notes,
  ]);

  return result.insertId;
}

export async function addSaleItem(connection, item) {
  const {
    sale_id,
    product_id,
    product_name,
    quantity,
    unit_price,
    discount_amount = 0,
    line_total,
  } = item;

  const sql = `
    INSERT INTO sale_items (
      sale_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      discount_amount,
      line_total
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await connection.execute(sql, [
    sale_id,
    product_id,
    product_name,
    quantity,
    unit_price,
    discount_amount,
    line_total,
  ]);

  return result.insertId;
}

export async function getSaleById(id) {
  const [sales] = await db.execute(
    `SELECT * FROM sales WHERE id = ? LIMIT 1`,
    [id]
  );

  if (sales.length === 0) {
    return null;
  }

  const [items] = await db.execute(
    `SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id ASC`,
    [id]
  );

  return {
    ...sales[0],
    items,
  };
}

export async function getAllSales() {
  const [rows] = await db.execute(`
    SELECT
      s.id,
      s.receipt_number,
      s.subtotal,
      s.discount_amount,
      s.tax_amount,
      s.total_amount,
      s.payment_method,
      s.payment_status,
      s.customer_id,
      s.cashier_name,
      s.created_at,
      COUNT(si.id) AS item_count
    FROM sales s
    LEFT JOIN sale_items si ON si.sale_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC, s.id DESC
  `);

  return rows;
}
