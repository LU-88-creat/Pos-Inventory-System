
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

const router = express.Router();

router.get("/", listSales);
router.post("/mpesa/callback", handleStkCallback);
router.post("/", addSale);
router.post("/:id/mpesa/stk-push", startStkPush);
router.get("/:id/mpesa-status", getMpesaStatus);
router.patch("/:id/complete-payment", completeSale);
router.patch("/:id/complete-cash", completeSale);
router.patch("/:id/cancel", cancelSale);
router.get("/profit-summary", profitSummary);
router.get("/:id", getSale);


export default router;
