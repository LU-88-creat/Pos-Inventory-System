
import db from "../config/db.js";

import {
  getProductForUpdate,
  updateProductStock,
  createStockMovement,
  getStockMovements,
} from "./stockModel.js";

const VALID_MOVEMENTS = {
  stock_in: "stock_in",
  stock_out: "stock_out",
  adjustment_in: "adjustment_in",
  adjustment_out: "adjustment_out",
};

function parsePositiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parsePositiveQuantity(value) {
  const quantity = Number(value);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return null;
  }

  // The database stores quantities to three decimal places.
  if (Math.round(quantity * 1000) !== quantity * 1000) {
    return null;
  }

  return quantity;
}

// GET /api/stock/movements
export async function listStockMovements(req, res) {
  try {
    const productId =
      req.query.product_id === undefined
        ? null
        : parsePositiveId(req.query.product_id);

    if (req.query.product_id !== undefined && productId === null) {
      return res.status(400).json({
        success: false,
        message: "A valid product_id is required.",
      });
    }

    const requestedLimit =
      req.query.limit === undefined ? 100 : Number(req.query.limit);

    if (
      !Number.isInteger(requestedLimit) ||
      requestedLimit < 1 ||
      requestedLimit > 500
    ) {
      return res.status(400).json({
        success: false,
        message: "Limit must be an integer between 1 and 500.",
      });
    }

    const movements = await getStockMovements({
      productId,
      limit: requestedLimit,
    });

    return res.status(200).json({
      success: true,
      data: movements,
    });
  } catch (error) {
    console.error("List stock movements error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve stock movements.",
    });
  }
}

// POST /api/stock/in
// POST /api/stock/out
// POST /api/stock/adjustment
export async function recordStockMovement(req, res) {
  const productId = parsePositiveId(req.body.product_id);
  const quantity = parsePositiveQuantity(req.body.quantity);
  const { movement_type, notes = null } = req.body;

  if (!productId || quantity === null) {
    return res.status(400).json({
      success: false,
      message: "A valid product_id and positive quantity are required.",
    });
  }

  if (!Object.hasOwn(VALID_MOVEMENTS, movement_type)) {
    return res.status(400).json({
      success: false,
      message: "Invalid stock movement type.",
    });
  }

  if (
    notes !== null &&
    (typeof notes !== "string" || notes.length > 255)
  ) {
    return res.status(400).json({
      success: false,
      message: "Notes must be text of at most 255 characters.",
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const product = await getProductForUpdate(connection, productId);

    if (!product) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Product not found or inactive.",
      });
    }

    const previousStock = Number(product.stock_quantity);
    const isStockIn =
      movement_type === "stock_in" ||
      movement_type === "adjustment_in";

    const newStock = Number(
      (previousStock + (isStockIn ? quantity : -quantity)).toFixed(3)
    );

    if (newStock < 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: `Insufficient stock for ${product.product_name}.`,
      });
    }

    await updateProductStock(connection, productId, newStock);

    const movementId = await createStockMovement(connection, {
      product_id: productId,
      movement_type: VALID_MOVEMENTS[movement_type],
      quantity,
      previous_stock: previousStock,
      new_stock: newStock,
      reference_type: "manual",
      notes: notes?.trim() || null,
    });

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Stock updated and movement recorded successfully.",
      data: {
        movement_id: movementId,
        product_id: productId,
        product_name: product.product_name,
        movement_type,
        quantity,
        previous_stock: previousStock,
        new_stock: newStock,
      },
    });
  } catch (error) {
    await connection.rollback();

    console.error("Record stock movement error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to record stock movement.",
    });
  } finally {
    connection.release();
  }
}
