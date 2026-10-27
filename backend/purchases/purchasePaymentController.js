
import {
  recordPurchasePayment,
  getPurchasePayments,
  getAllPurchasePayments,
} from "./purchasePaymentModel.js";

const VALID_PAYMENT_METHODS = [
  "cash",
  "mpesa",
  "bank_transfer",
  "cheque",
  "other",
];

export async function addPurchasePayment(req, res) {
  try {
    const purchaseId = Number(req.params.id);
    const {
      amount,
      payment_method,
      reference_number,
      payment_date,
      notes,
    } = req.body;

    if (!Number.isInteger(purchaseId) || purchaseId <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid purchase ID is required.",
      });
    }

    if (
      amount === undefined ||
      amount === null ||
      amount === "" ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be a number greater than zero.",
      });
    }

    if (!VALID_PAYMENT_METHODS.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Choose: ${VALID_PAYMENT_METHODS.join(", ")}.`,
      });
    }

    if (
      reference_number != null &&
      (typeof reference_number !== "string" ||
        reference_number.trim().length > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Reference number must be 100 characters or fewer.",
      });
    }

    if (
      notes != null &&
      (typeof notes !== "string" || notes.trim().length > 500)
    ) {
      return res.status(400).json({
        success: false,
        message: "Notes must be 500 characters or fewer.",
      });
    }

    if (
      payment_date != null &&
      (typeof payment_date !== "string" ||
        Number.isNaN(Date.parse(payment_date)))
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment date must be a valid date/time string.",
      });
    }

    const payment = await recordPurchasePayment({
      purchase_id: purchaseId,
      amount: Number(amount),
      payment_method,
      reference_number: reference_number?.trim() || null,
      payment_date: payment_date || null,
      notes: notes?.trim() || null,
    });

    return res.status(201).json({
      success: true,
      message: "Supplier payment recorded successfully.",
      data: payment,
    });
  } catch (error) {
    const clientErrors = [
      "Purchase not found.",
      "Payments can only be recorded for ordered or received purchases.",
      "Payment amount must be greater than zero.",
      "Invalid payment method.",
    ];

    if (
      clientErrors.includes(error.message) ||
      error.message.startsWith("Payment exceeds the outstanding balance")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("addPurchasePayment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to record supplier payment.",
    });
  }
}

export async function listPurchasePayments(req, res) {
  try {
    const purchaseId = Number(req.params.id);

    if (!Number.isInteger(purchaseId) || purchaseId <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid purchase ID is required.",
      });
    }

    const payments = await getPurchasePayments(purchaseId);

    return res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("listPurchasePayments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load supplier payment history.",
    });
  }
}

export async function listAllPurchasePayments(req, res) {
  try {
    const payments = await getAllPurchasePayments();

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error("Error fetching all purchase payments:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve supplier payment history.",
    });
  }
}
