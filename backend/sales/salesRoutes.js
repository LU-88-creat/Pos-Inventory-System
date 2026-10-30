import express from "express";

import {
  listSales,
  getSale,
  addSale,
  completeSale,
  cancelSale,
  profitSummary,
} from "./salesController.js";

import {
  getMpesaStatus,
  handleStkCallback,
  startStkPush,
} from "./mpesaController.js";

import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Public M-Pesa callback.
// Safaricom must be able to send payment notifications.
router.post("/mpesa/callback", handleStkCallback);

// Require authentication for employee-facing endpoints.
router.use(authenticateToken);

// Administrator and cashier access.
router.use(authorizeRoles("administrator", "cashier"));

router.get("/", listSales);
router.post("/", addSale);
router.post("/:id/mpesa/stk-push", startStkPush);
router.get("/:id/mpesa-status", getMpesaStatus);
router.patch("/:id/complete-payment", completeSale);
router.patch("/:id/complete-cash", completeSale);
router.patch("/:id/cancel", cancelSale);

// Administrator-only financial summary.
router.get(
  "/profit-summary",
  authorizeRoles("administrator"),
  profitSummary
);

router.get("/:id", getSale);

export default router;