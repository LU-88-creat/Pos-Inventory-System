
import db from "../config/db.js";

// Create a sale for a specific business.
export async function createSale(connection, saleData) {
  const {
    business_id,
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
      business_id,
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await connection.execute(sql, [
    business_id,
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

// Add a sale item for a specific business.
export async function addSaleItem(connection, item) {
  const {
    business_id,
    sale_id,
    product_id,
    product_name,
    quantity,
    unit_price,
    unit_cost_at_sale,
    discount_amount = 0,
    discount_rate = 0,
    tax_rate = 0,
    tax_amount = 0,
    line_total,
  } = item;

  const sql = `
    INSERT INTO sale_items (
      business_id,
      sale_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      unit_cost_at_sale,
      discount_amount,
      discount_rate,
      tax_rate,
      tax_amount,
      line_total
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await connection.execute(sql, [
    business_id,
    sale_id,
    product_id,
    product_name,
    quantity,
    unit_price,
    unit_cost_at_sale ?? null,
    discount_amount,
    discount_rate,
    tax_rate,
    tax_amount,
    line_total,
  ]);

  return result.insertId;
}

// Get one sale and its items belonging to a specific business.
export async function getSaleById(id, businessId) {
  const [sales] = await db.execute(
    `SELECT *
     FROM sales
     WHERE id = ? AND business_id = ?
     LIMIT 1`,
    [id, businessId]
  );

  if (sales.length === 0) {
    return null;
  }

  const [items] = await db.execute(
    `SELECT *
     FROM sale_items
     WHERE sale_id = ? AND business_id = ?
     ORDER BY id ASC`,
    [id, businessId]
  );

  return {
    ...sales[0],
    items,
  };
}

// Get all sales belonging to a specific business.
export async function getAllSales(businessId) {
  const [rows] = await db.execute(
    `
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
    LEFT JOIN sale_items si
      ON si.sale_id = s.id
      AND si.business_id = s.business_id
    WHERE s.business_id = ?
    GROUP BY s.id
    ORDER BY s.created_at DESC, s.id DESC
    `,
    [businessId]
  );

  return rows;
}

// Calculate profit summary for a specific business.
export async function getProfitSummary(businessId) {
  const [rows] = await db.execute(
    `
    SELECT
      COUNT(DISTINCT s.id) AS completed_sales_count,

      COUNT(
        DISTINCT CASE
          WHEN si.unit_cost_at_sale IS NULL THEN s.id
          ELSE NULL
        END
      ) AS sales_with_missing_cost,

      COALESCE(
        SUM(si.line_total - si.tax_amount),
        0
      ) AS revenue_excluding_tax,

      COALESCE(
        SUM(
          CASE
            WHEN si.unit_cost_at_sale IS NOT NULL
            THEN si.quantity * si.unit_cost_at_sale
            ELSE 0
          END
        ),
        0
      ) AS known_cost_of_goods_sold,

      COALESCE(
        SUM(
          CASE
            WHEN si.unit_cost_at_sale IS NOT NULL
            THEN si.line_total - si.tax_amount
                 - (si.quantity * si.unit_cost_at_sale)
            ELSE 0
          END
        ),
        0
      ) AS known_gross_profit,

      COALESCE(
        SUM(
          CASE
            WHEN si.unit_cost_at_sale IS NULL THEN 1
            ELSE 0
          END
        ),
        0
      ) AS items_missing_historical_cost

    FROM sales s
    INNER JOIN sale_items si
      ON si.sale_id = s.id
      AND si.business_id = s.business_id

    WHERE s.business_id = ?
      AND s.payment_status = 'completed'
    `,
    [businessId]
  );

  return rows[0];
}
