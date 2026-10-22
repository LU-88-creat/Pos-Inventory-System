
import express from "express";

import {
  listStockMovements,
  recordStockMovement,
} from "./stockController.js";

const router = express.Router();

// View stock movement history.
router.get("/movements", listStockMovements);

// Add stock.
router.post("/in", (req, res) => {
  req.body.movement_type = "stock_in";
  return recordStockMovement(req, res);
});

// Remove stock.
router.post("/out", (req, res) => {
  req.body.movement_type = "stock_out";
  return recordStockMovement(req, res);
});

// Correct stock discrepancies.
router.post("/adjustment", recordStockMovement);

export default router;
