
import db from "../config/db.js";

export async function recordPurchasePayment({
  purchase_id,
  amount,
  payment_method,
  reference_number = null,
  payment_date = null,
  notes = null,
}) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Lock the purchase so concurrent payments cannot overpay it.
    const [purchases] = await connection.execute(
      `SELECT id, total_amount, amount_paid, payment_status, status
       FROM purchases
       WHERE id = ?
       FOR UPDATE`,
      [purchase_id]
    );

    if (purchases.length === 0) {
      throw new Error("Purchase not found.");
    }

    const purchase = purchases[0];
    const totalAmount = Number(purchase.total_amount);
    const amountPaid = Number(purchase.amount_paid);
    const paymentAmount = Number(amount);

    if (["draft", "cancelled"].includes(purchase.status)) {
      throw new Error(
        "Payments can only be recorded for ordered or received purchases."
      );
    }

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      throw new Error("Payment amount must be greater than zero.");
    }

    const outstanding = Number((totalAmount - amountPaid).toFixed(2));

    if (paymentAmount > outstanding + 0.001) {
      throw new Error(
        `Payment exceeds the outstanding balance of ${outstanding.toFixed(2)}.`
      );
    }

    const validMethods = [
      "cash",
      "mpesa",
      "bank_transfer",
      "cheque",
      "other",
    ];

    if (!validMethods.includes(payment_method)) {
      throw new Error("Invalid payment method.");
    }

    const [paymentResult] = await connection.execute(
      `INSERT INTO purchase_payments (
        purchase_id,
        amount,
        payment_method,
        reference_number,
        payment_date,
        notes
      ) VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?)`,
      [
        purchase_id,
        paymentAmount,
        payment_method,
        reference_number,
        payment_date,
        notes,
      ]
    );

    const newAmountPaid = Number(
      (amountPaid + paymentAmount).toFixed(2)
    );

    const newPaymentStatus =
      newAmountPaid >= totalAmount ? "paid" : "partial";

    await connection.execute(
      `UPDATE purchases
       SET amount_paid = ?, payment_status = ?
       WHERE id = ?`,
      [newAmountPaid, newPaymentStatus, purchase_id]
    );

    await connection.commit();

    return {
      payment_id: paymentResult.insertId,
      purchase_id: Number(purchase_id),
      amount: paymentAmount,
      amount_paid: newAmountPaid,
      balance: Number((totalAmount - newAmountPaid).toFixed(2)),
      payment_status: newPaymentStatus,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getPurchasePayments(purchaseId) {
  const [rows] = await db.execute(
    `SELECT
       id,
       purchase_id,
       amount,
       payment_method,
       reference_number,
       payment_date,
       notes,
       created_at
     FROM purchase_payments
     WHERE purchase_id = ?
     ORDER BY payment_date DESC, id DESC`,
    [purchaseId]
  );

  return rows;
}

export async function getAllPurchasePayments() {
  const [rows] = await db.execute(
    `SELECT
       pp.id AS payment_id,
       pp.purchase_id,
       p.purchase_number,
       s.supplier_name,
       pp.amount,
       pp.payment_method,
       pp.reference_number,
       pp.payment_date,
       pp.notes,
       pp.created_at
     FROM purchase_payments pp
     INNER JOIN purchases p
       ON p.id = pp.purchase_id
     LEFT JOIN suppliers s
       ON s.id = p.supplier_id
     ORDER BY pp.payment_date DESC, pp.id DESC`
  );

  return rows;
}
