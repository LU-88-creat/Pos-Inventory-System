
import db from "../config/db.js";
import {
  createSale,
  addSaleItem,
  getSaleById,
  getAllSales,
} from "./salesModel.js";
import { fulfillSale } from "./saleFulfillment.js";


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
    let calculatedDiscount = 0;
    let calculatedTax = 0;
    const preparedItems = [];

    for (const item of items) {
      const [products] = await connection.execute(
        `SELECT id, product_name, selling_price, stock_quantity,
                tax_rate, discount_rate
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
      const discountRate = Number(product.discount_rate ?? 0);
      const taxRate = Number(product.tax_rate ?? 0);

      if (quantity > Number(product.stock_quantity)) {
        throw new Error(`Insufficient stock for ${product.product_name}.`);
      }

      const gross = Number((quantity * unitPrice).toFixed(2));
      const itemDiscount = Number((gross * discountRate / 100).toFixed(2));
      const taxableAmount = gross - itemDiscount;
      const itemTax = Number((taxableAmount * taxRate / 100).toFixed(2));
      const lineTotal = Number((taxableAmount + itemTax).toFixed(2));

      calculatedSubtotal += gross;
      calculatedDiscount += itemDiscount;
      calculatedTax += itemTax;

      preparedItems.push({
        product_id: product.id,
        product_name: product.product_name,
        quantity,
        unit_price: unitPrice,
        discount_amount: itemDiscount,
        discount_rate: discountRate,
        tax_rate: taxRate,
        tax_amount: itemTax,
        line_total: lineTotal,
      });
    }

    calculatedSubtotal = Number(calculatedSubtotal.toFixed(2));
    const totalDiscount = Number(calculatedDiscount.toFixed(2));
    const tax = Number(calculatedTax.toFixed(2));
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


export async function completeSale(req, res) {
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
        "M-Pesa sales can only be completed after a successful Daraja callback."
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

    await fulfillSale(connection, id, sale);

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: `${sale.payment_method === "mpesa" ? "M-Pesa" : "Cash"} sale completed and stock updated.`,
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

    console.error("Complete sale error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to complete sale.",
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

    const [pendingMpesaAttempts] = await connection.execute(
      `SELECT id
       FROM mpesa_transactions
       WHERE sale_id = ? AND status = 'pending'
       LIMIT 1`,
      [id]
    );

    if (pendingMpesaAttempts.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "This sale cannot be cancelled while an M-Pesa request is pending.",
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
