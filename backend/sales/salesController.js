
import db from "../config/db.js";
import {
  createSale,
  addSaleItem,
  getSaleById,
  getAllSales,
} from "./salesModel.js";

export async function listSales(req, res) {
  try {
    const sales = await getAllSales();

    return res.status(200).json({
      success: true,
      data: sales,
    });
  } catch (error) {
    console.error("List sales error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve sales.",
    });
  }
}

export async function getSale(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid sale ID is required.",
      });
    }

    const sale = await getSaleById(id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: sale,
    });
  } catch (error) {
    console.error("Get sale error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve sale.",
    });
  }
}

export async function addSale(req, res) {
  const {
    receipt_number,
    subtotal,
    discount_amount = 0,
    tax_amount = 0,
    total_amount,
    payment_method,
    customer_id = null,
    cashier_name = null,
    notes = null,
    items,
  } = req.body;

  if (
    typeof receipt_number !== "string" ||
    !receipt_number.trim() ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Receipt number and at least one sale item are required.",
    });
  }

  if (
    !["cash", "mpesa"].includes(payment_method) ||
    ![subtotal, total_amount].every(
      (value) => value !== undefined && Number.isFinite(Number(value)) && Number(value) >= 0
    ) ||
    ![discount_amount, tax_amount].every(
      (value) => Number.isFinite(Number(value)) && Number(value) >= 0
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment method or sale amounts.",
    });
  }

  if (
    customer_id !== null &&
    (!Number.isInteger(Number(customer_id)) || Number(customer_id) <= 0)
  ) {
    return res.status(400).json({
      success: false,
      message: "Customer ID must be a positive integer or null.",
    });
  }

  if (
    items.some((item) =>
      !Number.isInteger(Number(item.product_id)) ||
      Number(item.product_id) <= 0 ||
      !Number.isFinite(Number(item.quantity)) ||
      Number(item.quantity) <= 0
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Every item must have a valid product ID and positive quantity.",
    });
  }

  const connection = await db.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    let calculatedSubtotal = 0;
    const preparedItems = [];

    for (const item of items) {
      const [products] = await connection.execute(
        `SELECT id, product_name, selling_price, stock_quantity
         FROM products
         WHERE id = ? AND is_active = TRUE
         FOR UPDATE`,
        [Number(item.product_id)]
      );

      if (products.length === 0) {
        throw new Error(`Product ${item.product_id} was not found or is inactive.`);
      }

      const product = products[0];
      const quantity = Number(item.quantity);
      const unitPrice = Number(product.selling_price);
      const itemDiscount = Number(item.discount_amount ?? 0);

      if (!Number.isFinite(itemDiscount) || itemDiscount < 0) {
        throw new Error("Item discounts must be valid non-negative amounts.");
      }

      if (quantity > Number(product.stock_quantity)) {
        throw new Error(`Insufficient stock for ${product.product_name}.`);
      }

      const gross = quantity * unitPrice;

      if (itemDiscount > gross) {
        throw new Error(`Discount exceeds the item amount for ${product.product_name}.`);
      }

      const lineTotal = Number((gross - itemDiscount).toFixed(2));

      calculatedSubtotal += gross;

      preparedItems.push({
        product_id: product.id,
        product_name: product.product_name,
        quantity,
        unit_price: unitPrice,
        discount_amount: itemDiscount,
        line_total: lineTotal,
      });
    }

    calculatedSubtotal = Number(calculatedSubtotal.toFixed(2));

    const totalDiscount = Number(discount_amount);
    const tax = Number(tax_amount);
    const calculatedTotal = Number(
      (calculatedSubtotal - totalDiscount + tax).toFixed(2)
    );

    if (totalDiscount > calculatedSubtotal || calculatedTotal < 0) {
      throw new Error("Sale discount or total amount is invalid.");
    }

    if (
      Math.abs(Number(subtotal) - calculatedSubtotal) > 0.01 ||
      Math.abs(Number(total_amount) - calculatedTotal) > 0.01
    ) {
      throw new Error("Sale totals do not match the server-calculated amounts.");
    }

    if (customer_id !== null) {
      const [customers] = await connection.execute(
        "SELECT id FROM customers WHERE id = ? AND is_active = TRUE",
        [Number(customer_id)]
      );

      if (customers.length === 0) {
        throw new Error("The selected customer does not exist or is inactive.");
      }
    }

    const saleData = {
      receipt_number: receipt_number.trim(),
      subtotal: calculatedSubtotal,
      discount_amount: totalDiscount,
      tax_amount: tax,
      total_amount: calculatedTotal,
      payment_method,
      payment_status: "pending",
      customer_id: customer_id === null ? null : Number(customer_id),
      cashier_name,
      notes,
    };

    const saleId = await createSale(connection, saleData);

    for (const item of preparedItems) {
      await addSaleItem(connection, {
        sale_id: saleId,
        ...item,
      });
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Sale recorded as pending. Stock has not been deducted.",
      data: {
        id: saleId,
        receipt_number: saleData.receipt_number,
        payment_status: "pending",
        total_amount: calculatedTotal,
        payment_method,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error("Create sale error:", error.message);

    const isValidationError =
      error.message.includes("not found") ||
      error.message.includes("Insufficient stock") ||
      error.message.includes("Discount") ||
      error.message.includes("discount") ||
      error.message.includes("totals") ||
      error.message.includes("total amount") ||
      error.message.includes("Customer") ||
      error.message.includes("Sale ");

    return res.status(isValidationError ? 400 : 500).json({
      success: false,
      message: isValidationError
        ? error.message
        : "Failed to record sale.",
    });
  } finally {
    connection.release();
  }
}


export async function completeCashSale(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "A valid sale ID is required.",
    });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [sales] = await connection.execute(
      `SELECT id, payment_method, payment_status
       FROM sales
       WHERE id = ?
       FOR UPDATE`,
      [id]
    );

    if (sales.length === 0) {
      const error = new Error("Sale not found.");
      error.statusCode = 404;
      throw error;
    }

    const sale = sales[0];

    if (sale.payment_method !== "cash") {
      const error = new Error(
        "Only cash sales can be completed through this endpoint."
      );
      error.statusCode = 409;
      throw error;
    }

    if (sale.payment_status !== "pending") {
      const error = new Error(
        "This sale is not pending and cannot be completed again."
      );
      error.statusCode = 409;
      throw error;
    }

    const [items] = await connection.execute(
      `SELECT product_id, quantity
       FROM sale_items
       WHERE sale_id = ?
       ORDER BY id ASC`,
      [id]
    );

    if (items.length === 0) {
      const error = new Error("Cannot complete a sale without items.");
      error.statusCode = 400;
      throw error;
    }

    // Deduct stock safely. If any item lacks stock,
    // the whole transaction will be rolled back.
    for (const item of items) {
      const quantity = Number(item.quantity);

      const [result] = await connection.execute(
        `UPDATE products
         SET stock_quantity = stock_quantity - ?
         WHERE id = ?
           AND stock_quantity >= ?`,
        [quantity, item.product_id, quantity]
      );

      if (result.affectedRows !== 1) {
        const error = new Error(
          `Insufficient stock for product ID ${item.product_id}.`
        );
        error.statusCode = 409;
        throw error;
      }
    }

    await connection.execute(
      `UPDATE sales
       SET payment_status = 'completed'
       WHERE id = ? AND payment_status = 'pending'`,
      [id]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Cash sale completed and stock updated.",
      data: {
        sale_id: id,
        payment_status: "completed",
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Complete cash sale error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to complete cash sale.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}


export async function cancelSale(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "A valid sale ID is required.",
    });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [sales] = await connection.execute(
      `SELECT id, payment_status
       FROM sales
       WHERE id = ?
       FOR UPDATE`,
      [id]
    );

    if (sales.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Sale not found.",
      });
    }

    if (sales[0].payment_status !== "pending") {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "Only pending sales can be cancelled.",
      });
    }

    await connection.execute(
      `UPDATE sales
       SET payment_status = 'cancelled'
       WHERE id = ?`,
      [id]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Pending sale cancelled successfully.",
      data: {
        sale_id: id,
        payment_status: "cancelled",
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Cancel sale error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel sale.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
