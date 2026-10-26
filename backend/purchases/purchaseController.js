
import {
  getAllPurchases,
  getPurchaseById,
  createDraftPurchase,
  orderPurchase,
  receivePurchase,
} from "./purchaseModel.js";

const VALID_STATUSES = [
  "all",
  "draft",
  "ordered",
  "partially_received",
  "received",
  "cancelled",
];

function isValidId(value) {
  return (
    value !== undefined &&
    value !== null &&
    String(value).trim() !== "" &&
    Number.isInteger(Number(value)) &&
    Number(value) > 0
  );
}

export async function listPurchases(req, res) {
  try {
    const { search = "", status = "all", supplier_id = "" } = req.query;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase status filter.",
      });
    }

    if (supplier_id !== "" && !isValidId(supplier_id)) {
      return res.status(400).json({
        success: false,
        message: "supplier_id must be a positive integer.",
      });
    }

    const purchases = await getAllPurchases({
      search: String(search),
      status,
      supplier_id,
    });

    return res.status(200).json({
      success: true,
      count: purchases.length,
      data: purchases,
    });
  } catch (error) {
    console.error("List purchases error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve purchases.",
    });
  }
}

export async function getPurchase(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase ID.",
      });
    }

    const purchase = await getPurchaseById(Number(req.params.id));

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    console.error("Get purchase error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve purchase.",
    });
  }
}

export async function addPurchase(req, res) {
  try {
    const {
      purchase_number,
      supplier_id,
      purchase_date,
      expected_date = null,
      notes = null,
      items,
    } = req.body;

    if (
      typeof purchase_number !== "string" ||
      !purchase_number.trim() ||
      purchase_number.trim().length > 50
    ) {
      return res.status(400).json({
        success: false,
        message: "purchase_number is required and must not exceed 50 characters.",
      });
    }

    if (!isValidId(supplier_id)) {
      return res.status(400).json({
        success: false,
        message: "A valid supplier_id is required.",
      });
    }

    if (
      typeof purchase_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(purchase_date) ||
      Number.isNaN(Date.parse(`${purchase_date}T00:00:00Z`)) ||
      new Date(`${purchase_date}T00:00:00Z`).toISOString().slice(0, 10) !== purchase_date
    ) {
      return res.status(400).json({
        success: false,
        message: "purchase_date must be a valid date in YYYY-MM-DD format.",
      });
    }

    if (
      expected_date !== null &&
      (typeof expected_date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(expected_date) ||
        Number.isNaN(Date.parse(`${expected_date}T00:00:00Z`)) ||
        new Date(`${expected_date}T00:00:00Z`).toISOString().slice(0, 10) !== expected_date)
    ) {
      return res.status(400).json({
        success: false,
        message: "expected_date must be null or a valid YYYY-MM-DD date.",
      });
    }

    if (
      expected_date &&
      expected_date < purchase_date
    ) {
      return res.status(400).json({
        success: false,
        message: "expected_date cannot be earlier than purchase_date.",
      });
    }

    if (
      notes !== null &&
      (typeof notes !== "string" || notes.length > 500)
    ) {
      return res.status(400).json({
        success: false,
        message: "notes must be text with a maximum of 500 characters.",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one purchase item is required.",
      });
    }

    const purchase = await createDraftPurchase({
      purchase_number: purchase_number.trim(),
      supplier_id: Number(supplier_id),
      purchase_date,
      expected_date,
      notes,
      items,
    });

    return res.status(201).json({
      success: true,
      message: "Draft purchase created successfully.",
      data: purchase,
    });
  } catch (error) {
    console.error("Create purchase error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "This purchase number already exists.",
      });
    }

    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create purchase.",
    });
  }
}


export async function orderPurchaseController(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase ID.",
      });
    }

    const purchase = await orderPurchase(Number(req.params.id));

    return res.status(200).json({
      success: true,
      message: "Purchase ordered successfully.",
      data: purchase,
    });
  } catch (error) {
    console.error("Order purchase error:", error);

    if (error.statusCode === 404 || error.statusCode === 409 || error.statusCode === 400) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to order purchase.",
    });
  }
}

export async function receivePurchaseController(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase ID.",
      });
    }

    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one item to receive.",
      });
    }

    const purchase = await receivePurchase(
      Number(req.params.id),
      items
    );

    return res.status(200).json({
      success: true,
      message: "Purchase goods received successfully.",
      data: purchase,
    });
  } catch (error) {
    console.error("Receive purchase error:", error);

    if ([400, 404, 409].includes(error.statusCode)) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to receive purchase goods.",
    });
  }
}
