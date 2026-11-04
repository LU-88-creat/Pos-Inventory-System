import db from "../config/db.js";

import {
  initiateStkPush,
  queryStkPushStatus,
  isValidCallbackToken,
  normalizeKenyanPhoneNumber,
  validateDarajaConfig,
} from "./darajaService.js";

import { fulfillSale } from "./saleFulfillment.js";
import { getSaleById } from "./salesModel.js";

const lastStkQueryAt = new Map();
const STK_QUERY_INTERVAL_MS = 10 * 1000;
const STK_QUERY_INITIAL_DELAY_SECONDS = 5;

async function markMpesaAttemptFailed(attemptId, resultCode, resultDescription) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [transactions] = await connection.execute(
      `SELECT id, sale_id, status
       FROM mpesa_transactions
       WHERE id = ?
       FOR UPDATE`,
      [attemptId]
    );
    const transaction = transactions[0];

    if (!transaction || transaction.status !== "pending") {
      await connection.commit();
      return;
    }

    const [sales] = await connection.execute(
      `SELECT id, payment_method, payment_status
       FROM sales
       WHERE id = ?
       FOR UPDATE`,
      [transaction.sale_id]
    );
    const sale = sales[0];

    if (!sale || sale.payment_method !== "mpesa") {
      throw new Error("M-Pesa query is not linked to a valid M-Pesa sale.");
    }

    if (sale.payment_status === "pending") {
      await connection.execute(
        `UPDATE sales
         SET payment_status = 'cancelled'
         WHERE id = ? AND payment_status = 'pending'`,
        [sale.id]
      );
    } else if (sale.payment_status !== "cancelled") {
      await connection.commit();
      return;
    }

    await connection.execute(
      `UPDATE mpesa_transactions
       SET status = 'failed',
           result_code = ?,
           result_description = ?
       WHERE id = ? AND status = 'pending'`,
      [resultCode, String(resultDescription).slice(0, 255), transaction.id]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function startStkPush(req, res) {
  let attemptId = null;
  let attemptPersisted = false;
  let requestMayHaveReachedSafaricom = false;
  let connection;
  let transactionStarted = false;
  const saleId = Number(req.params.id);
  if (!Number.isInteger(saleId) || saleId <= 0) {
    return res.status(400).json({
      success: false,
      message: "A valid sale ID is required.",
    });
  }

  let phoneNumber;
  try {
    phoneNumber = normalizeKenyanPhoneNumber(req.body?.phone_number);
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  try {
    validateDarajaConfig();

    connection = await db.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [sales] = await connection.execute(
      `SELECT id, payment_method, payment_status, total_amount
       FROM sales
       WHERE id = ?
       FOR UPDATE`,
      [saleId]
    );
    const sale = sales[0];

    if (!sale) {
      const error = new Error("Sale not found.");
      error.statusCode = 404;
      throw error;
    }

    if (sale.payment_method !== "mpesa") {
      const error = new Error("STK Push is only available for M-Pesa sales.");
      error.statusCode = 409;
      throw error;
    }

    if (sale.payment_status !== "pending") {
      const error = new Error("This sale is no longer awaiting payment.");
      error.statusCode = 409;
      throw error;
    }

    const [attempts] = await connection.execute(
      `SELECT id, status, requested_amount
       FROM mpesa_transactions
       WHERE sale_id = ?
       ORDER BY id DESC
       LIMIT 1
       FOR UPDATE`,
      [saleId]
    );

    if (["pending", "initiating"].includes(attempts[0]?.status)) {
      await connection.commit();
      transactionStarted = false;
      connection.release();
      connection = null;
      return res.status(202).json({
        success: true,
        message:
          attempts[0].status === "pending"
            ? "An M-Pesa request is already pending for this sale."
            : "The request is being confirmed with Safaricom. Do not send another prompt yet.",
        data: {
          sale_id: saleId,
          payment_status: attempts[0].status,
          requested_amount: attempts[0].requested_amount,
        },
      });
    }

    const amount = Math.round(Number(sale.total_amount));
    if (!Number.isFinite(amount) || amount < 1) {
      const error = new Error("M-Pesa requires a payment amount of at least KSh 1.");
      error.statusCode = 400;
      throw error;
    }

    const [insertResult] = await connection.execute(
      `INSERT INTO mpesa_transactions (
         sale_id,
         phone_number,
         requested_amount,
         status
       )
       VALUES (?, ?, ?, 'initiating')`,
      [saleId, phoneNumber, amount]
    );
    attemptId = insertResult.insertId;
    await connection.commit();
    transactionStarted = false;
    attemptPersisted = true;
    connection.release();
    connection = null;

    const stkRequest = await initiateStkPush({
      phoneNumber,
      amount,
      saleId,
    });
    requestMayHaveReachedSafaricom = true;

    await db.execute(
      `UPDATE mpesa_transactions
       SET merchant_request_id = ?,
           checkout_request_id = ?,
           status = 'pending'
       WHERE id = ? AND status = 'initiating'`,
      [
        stkRequest.merchantRequestId,
        stkRequest.checkoutRequestId,
        attemptId,
      ]
    );

    return res.status(202).json({
      success: true,
      message: stkRequest.customerMessage,
      data: {
        sale_id: saleId,
        payment_status: "pending",
        requested_amount: amount,
      },
    });
  } catch (error) {
    if (connection && transactionStarted) {
      await connection.rollback();
    }
    if (connection) {
      connection.release();
    }

    console.error(
      "Start M-Pesa STK Push error:",
      JSON.stringify({
        stage: error.stage ?? "configuration or local request setup",
        statusCode: error.statusCode ?? null,
        message: error.message,
      })
    );
    if (
      attemptPersisted &&
      (error.definitive || error.paymentRequestSent === false)
    ) {
      await db.execute(
        `UPDATE mpesa_transactions
         SET status = 'failed', result_description = ?
         WHERE id = ? AND status = 'initiating'`,
        [String(error.message).slice(0, 255), attemptId]
      );
    }

    if (error.paymentRequestSent === true) {
      requestMayHaveReachedSafaricom = true;
    }

    if (attemptPersisted && requestMayHaveReachedSafaricom && !error.definitive) {
      return res.status(202).json({
        success: true,
        message:
          "Safaricom's response could not be confirmed. The payment status is being checked; do not send another prompt.",
        data: {
          sale_id: saleId,
          payment_status: "initiating",
        },
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(502).json({
      success: false,
      message: error.message || "Could not start the M-Pesa payment request.",
    });
  }
}

export async function getMpesaStatus(req, res) {
  const saleId = Number(req.params.id);

  if (!Number.isInteger(saleId) || saleId <= 0) {
    return res.status(400).json({
      success: false,
      message: "A valid sale ID is required.",
    });
  }

  try {
    let sale = await getSaleById(saleId);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found.",
      });
    }

    const [attempts] = await db.execute(
      `SELECT id, status, requested_amount, result_code,
              result_description, mpesa_receipt_number,
              checkout_request_id,
              TIMESTAMPDIFF(SECOND, created_at, NOW()) AS age_seconds
       FROM mpesa_transactions
       WHERE sale_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [saleId]
    );

    let attempt = attempts[0] ?? null;

    const lastQueryTime = attempt
      ? lastStkQueryAt.get(attempt.id) ?? 0
      : 0;

    if (
      attempt &&
      attempt.status === "pending" &&
      attempt.checkout_request_id &&
      Number(attempt.age_seconds) >= STK_QUERY_INITIAL_DELAY_SECONDS &&
      Date.now() - lastQueryTime >= STK_QUERY_INTERVAL_MS
    ) {
      lastStkQueryAt.set(attempt.id, Date.now());

      try {
        const queryResult = await queryStkPushStatus({
          checkoutRequestId: attempt.checkout_request_id,
        });

        const queryResultCode = Number(queryResult.ResultCode);
        if (
          String(queryResult.ResponseCode) === "0" &&
          queryResult.ResultCode !== undefined &&
          queryResult.ResultCode !== null &&
          Number.isInteger(queryResultCode) &&
          queryResultCode !== 0
        ) {
          await markMpesaAttemptFailed(
            attempt.id,
            queryResultCode,
            queryResult.ResultDesc || "M-Pesa payment was not completed."
          );
        }
      } catch (queryError) {
        console.error(
          "M-Pesa STK Query error:",
          queryError.message
        );
      }

      sale = await getSaleById(saleId);
      const [updatedAttempts] = await db.execute(
        `SELECT id, status, requested_amount, result_code,
                result_description, mpesa_receipt_number,
                checkout_request_id,
                TIMESTAMPDIFF(SECOND, created_at, NOW()) AS age_seconds
         FROM mpesa_transactions
         WHERE sale_id = ?
         ORDER BY id DESC
         LIMIT 1`,
        [saleId]
      );
      attempt = updatedAttempts[0] ?? null;
    }

    return res.status(200).json({
      success: true,
      data: {
        sale,
        attempt,
      },
    });
  } catch (error) {
    console.error("Get M-Pesa payment status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve M-Pesa payment status.",
    });
  }
}

export async function handleStkCallback(req, res) {
  if (!isValidCallbackToken(req.query.token)) {
    return res.status(401).json({
      ResultCode: 1,
      ResultDesc: "Unauthorized callback.",
    });
  }

  const callback = req.body?.Body?.stkCallback;
  const checkoutRequestId = callback?.CheckoutRequestID;
  const resultCode = Number(callback?.ResultCode);

  if (!checkoutRequestId || !Number.isInteger(resultCode)) {
    return res.status(400).json({
      ResultCode: 1,
      ResultDesc: "Invalid callback payload.",
    });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [transactions] = await connection.execute(
      `SELECT id, sale_id, status, phone_number, requested_amount
       FROM mpesa_transactions
       WHERE checkout_request_id = ?
       FOR UPDATE`,
      [checkoutRequestId]
    );
    const transaction = transactions[0];

    if (!transaction) {
      await connection.rollback();
      console.warn("Received M-Pesa callback for an unknown checkout request.");
      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Callback acknowledged.",
      });
    }

    if (transaction.status !== "pending") {
      await connection.commit();
      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Callback already processed.",
      });
    }

    const metadata = callback.CallbackMetadata?.Item ?? [];
    const receiptNumber = metadata.find(
      (item) => item.Name === "MpesaReceiptNumber"
    )?.Value;
    const callbackAmount = Number(
      metadata.find((item) => item.Name === "Amount")?.Value
    );
    const callbackPhone = String(
      metadata.find((item) => item.Name === "PhoneNumber")?.Value ?? ""
    );
    const resultDescription = String(callback.ResultDesc ?? "").slice(0, 255);

    const [sales] = await connection.execute(
      `SELECT id, payment_method, payment_status
       FROM sales
       WHERE id = ?
       FOR UPDATE`,
      [transaction.sale_id]
    );
    const sale = sales[0];

    if (!sale || sale.payment_method !== "mpesa") {
      throw new Error("M-Pesa callback is not linked to a valid M-Pesa sale.");
    }

    if (resultCode === 0) {
      if (
        callbackAmount !== Number(transaction.requested_amount) ||
        callbackPhone !== transaction.phone_number ||
        !receiptNumber
      ) {
        throw new Error(
          "M-Pesa callback amount, phone number, or receipt does not match the request."
        );
      }

      if (sale.payment_status === "pending") {
        await fulfillSale(connection, sale.id, sale);
      } else if (sale.payment_status !== "completed") {
        throw new Error(
          `M-Pesa payment succeeded for sale ${sale.id}, which is ${sale.payment_status}.`
        );
      }
    } else if (sale.payment_status === "pending") {
      await connection.execute(
        `UPDATE sales
         SET payment_status = 'cancelled'
         WHERE id = ? AND payment_status = 'pending'`,
        [sale.id]
      );
    } else if (sale.payment_status !== "cancelled") {
      throw new Error(
        `M-Pesa payment failed for sale ${sale.id}, which is ${sale.payment_status}.`
      );
    }

    await connection.execute(
      `UPDATE mpesa_transactions
       SET status = ?,
           result_code = ?,
           result_description = ?,
           mpesa_receipt_number = ?
       WHERE id = ?`,
      [
        resultCode === 0 ? "completed" : "failed",
        resultCode,
        resultDescription,
        receiptNumber ? String(receiptNumber).slice(0, 32) : null,
        transaction.id,
      ]
    );

    await connection.commit();
    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: "Callback processed.",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Process M-Pesa STK callback error:", error.message);
    return res.status(500).json({
      ResultCode: 1,
      ResultDesc: "Callback processing failed.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
