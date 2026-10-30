
import express from "express";

import {
  listStockMovements,
  recordStockMovement,
} from "./stockController.js";

import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Require login and administrator/storekeeper role.
router.use(authenticateToken);
router.use(authorizeRoles("administrator", "storekeeper"));

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
