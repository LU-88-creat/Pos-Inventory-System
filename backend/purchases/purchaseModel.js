
import db from "../config/db.js";

export async function getAllPurchases({
  search = "",
  status = "all",
  supplier_id = "",
} = {}) {
  let sql = `
    SELECT
      p.id,
      p.purchase_number,
      p.supplier_id,
      s.supplier_name,
      p.purchase_date,
      p.expected_date,
      p.status,
      p.subtotal,
      p.tax_amount,
      p.discount_amount,
      p.total_amount,
      p.amount_paid,
      p.payment_status,
      p.notes,
      p.created_at,
      p.updated_at
    FROM purchases p
    INNER JOIN suppliers s ON s.id = p.supplier_id
    WHERE 1 = 1
  `;

  const params = [];

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    sql += ` AND (
      p.purchase_number LIKE ?
      OR s.supplier_name LIKE ?
    )`;
    params.push(term, term);
  }

  if (status !== "all") {
    sql += " AND p.status = ?";
    params.push(status);
  }

  if (supplier_id !== "") {
    sql += " AND p.supplier_id = ?";
    params.push(supplier_id);
  }

  sql += " ORDER BY p.created_at DESC, p.id DESC";

  const [rows] = await db.execute(sql, params);
  return rows;
}

export async function getPurchaseById(id) {
  const [purchases] = await db.execute(
    `SELECT
       p.*,
       s.supplier_name,
       s.contact_person,
       s.phone AS supplier_phone
     FROM purchases p
     INNER JOIN suppliers s ON s.id = p.supplier_id
     WHERE p.id = ?
     LIMIT 1`,
    [id]
  );

  if (purchases.length === 0) {
    return null;
  }

  const purchase = purchases[0];

  const [items] = await db.execute(
    `SELECT
       pi.id,
       pi.purchase_id,
       pi.product_id,
       pr.product_name,
       pr.sku,
       pr.unit_of_measure,
       pi.quantity,
       pi.received_quantity,
       pi.unit_cost,
       pi.line_total
     FROM purchase_items pi
     INNER JOIN products pr ON pr.id = pi.product_id
     WHERE pi.purchase_id = ?
     ORDER BY pi.id ASC`,
    [id]
  );

  return {
    ...purchase,
    items,
  };
}

export async function createDraftPurchase({
  purchase_number,
  supplier_id,
  purchase_date,
  expected_date = null,
  notes = null,
  items,
}) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [suppliers] = await connection.execute(
      `SELECT id
       FROM suppliers
       WHERE id = ? AND is_active = 1
       FOR UPDATE`,
      [supplier_id]
    );

    if (suppliers.length === 0) {
      const error = new Error("Supplier not found or inactive.");
      error.statusCode = 400;
      throw error;
    }

    let subtotal = 0;

    const preparedItems = [];

    for (const item of items) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);
      const unitCost = Number(item.unit_cost);

      if (
        !Number.isInteger(productId) ||
        productId <= 0 ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(unitCost) ||
        unitCost < 0
      ) {
        const error = new Error(
          "Each item must have a valid product, positive quantity, and non-negative unit cost."
        );
        error.statusCode = 400;
        throw error;
      }

      const [products] = await connection.execute(
        `SELECT id, product_name
         FROM products
         WHERE id = ? AND is_active = 1
         FOR UPDATE`,
        [productId]
      );

      if (products.length === 0) {
        const error = new Error(
          `Product ${productId} was not found or is inactive.`
        );
        error.statusCode = 400;
        throw error;
      }

      const lineTotal = Number((quantity * unitCost).toFixed(2));
      subtotal = Number((subtotal + lineTotal).toFixed(2));

      preparedItems.push({
        product_id: productId,
        quantity,
        unit_cost: unitCost,
        line_total: lineTotal,
      });
    }

    const [result] = await connection.execute(
      `INSERT INTO purchases (
        purchase_number,
        supplier_id,
        purchase_date,
        expected_date,
        status,
        subtotal,
        total_amount,
        notes
      ) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?)`,
      [
        purchase_number,
        supplier_id,
        purchase_date,
        expected_date,
        subtotal,
        subtotal,
        notes,
      ]
    );

    const purchaseId = result.insertId;

    for (const item of preparedItems) {
      await connection.execute(
        `INSERT INTO purchase_items (
          purchase_id,
          product_id,
          quantity,
          received_quantity,
          unit_cost,
          line_total
        ) VALUES (?, ?, ?, 0, ?, ?)`,
        [
          purchaseId,
          item.product_id,
          item.quantity,
          item.unit_cost,
          item.line_total,
        ]
      );
    }

    await connection.commit();

    return await getPurchaseById(purchaseId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}


export async function orderPurchase(id) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [purchases] = await connection.execute(
      `SELECT id, status
       FROM purchases
       WHERE id = ?
       FOR UPDATE`,
      [id]
    );

    if (purchases.length === 0) {
      const error = new Error("Purchase not found.");
      error.statusCode = 404;
      throw error;
    }

    if (purchases[0].status !== "draft") {
      const error = new Error(
        "Only draft purchases can be ordered."
      );
      error.statusCode = 409;
      throw error;
    }

    const [items] = await connection.execute(
      `SELECT id
       FROM purchase_items
       WHERE purchase_id = ?
       LIMIT 1`,
      [id]
    );

    if (items.length === 0) {
      const error = new Error(
        "A purchase must contain at least one item before it can be ordered."
      );
      error.statusCode = 400;
      throw error;
    }

    await connection.execute(
      `UPDATE purchases
       SET status = 'ordered'
       WHERE id = ?`,
      [id]
    );

    await connection.commit();

    return await getPurchaseById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function receivePurchase(id, receivedItems) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [purchases] = await connection.execute(
      `SELECT id, status
       FROM purchases
       WHERE id = ?
       FOR UPDATE`,
      [id]
    );

    if (purchases.length === 0) {
      const error = new Error("Purchase not found.");
      error.statusCode = 404;
      throw error;
    }

    const purchase = purchases[0];

    if (!["ordered", "partially_received"].includes(purchase.status)) {
      const error = new Error(
        "Only ordered or partially received purchases can receive goods."
      );
      error.statusCode = 409;
      throw error;
    }

    if (!Array.isArray(receivedItems) || receivedItems.length === 0) {
      const error = new Error(
        "Provide at least one purchase item to receive."
      );
      error.statusCode = 400;
      throw error;
    }

    const [purchaseItems] = await connection.execute(
      `SELECT id, product_id, quantity, received_quantity
       FROM purchase_items
       WHERE purchase_id = ?
       FOR UPDATE`,
      [id]
    );

    const requested = new Map();

    for (const item of receivedItems) {
      const itemId = Number(item.purchase_item_id);
      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(itemId) ||
        itemId <= 0 ||
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        const error = new Error(
          "Each received item must have a valid purchase_item_id and a positive quantity."
        );
        error.statusCode = 400;
        throw error;
      }

      if (requested.has(itemId)) {
        const error = new Error(
          "Do not submit the same purchase item more than once."
        );
        error.statusCode = 400;
        throw error;
      }

      requested.set(itemId, quantity);
    }

    for (const [itemId, receiveQuantity] of requested) {
      const item = purchaseItems.find(
        (purchaseItem) => purchaseItem.id === itemId
      );

      if (!item) {
        const error = new Error(
          `Purchase item ${itemId} does not belong to this purchase.`
        );
        error.statusCode = 400;
        throw error;
      }

      const outstanding =
        Number(item.quantity) - Number(item.received_quantity);

      if (receiveQuantity > outstanding) {
        const error = new Error(
          `Cannot receive ${receiveQuantity} units for purchase item ${itemId}. Outstanding quantity is ${outstanding}.`
        );
        error.statusCode = 400;
        throw error;
      }

      const [products] = await connection.execute(
        `SELECT id, stock_quantity
         FROM products
         WHERE id = ? AND is_active = 1
         FOR UPDATE`,
        [item.product_id]
      );

      if (products.length === 0) {
        const error = new Error(
          `Product ${item.product_id} was not found or is inactive.`
        );
        error.statusCode = 400;
        throw error;
      }

      const previousStock = Number(products[0].stock_quantity);
      const newStock = Number(
        (previousStock + receiveQuantity).toFixed(3)
      );

      await connection.execute(
        `UPDATE products
         SET stock_quantity = ?
         WHERE id = ?`,
        [newStock, item.product_id]
      );

      await connection.execute(
        `UPDATE purchase_items
         SET received_quantity = received_quantity + ?
         WHERE id = ?`,
        [receiveQuantity, itemId]
      );

      await connection.execute(
        `INSERT INTO stock_movements (
          product_id,
          movement_type,
          quantity,
          previous_stock,
          new_stock,
          reference_type,
          reference_id,
          notes
        ) VALUES (?, 'stock_in', ?, ?, ?, 'purchase', ?, ?)`,
        [
          item.product_id,
          receiveQuantity,
          previousStock,
          newStock,
          Number(id),
          `Goods received for purchase ID ${id}`,
        ]
      );
    }

    const [updatedItems] = await connection.execute(
      `SELECT quantity, received_quantity
       FROM purchase_items
       WHERE purchase_id = ?`,
      [id]
    );

    const allReceived = updatedItems.every(
      (item) =>
        Number(item.received_quantity) >= Number(item.quantity)
    );

    const newStatus = allReceived ? "received" : "partially_received";

    await connection.execute(
      `UPDATE purchases
       SET status = ?
       WHERE id = ?`,
      [newStatus, id]
    );

    await connection.commit();

    return await getPurchaseById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
