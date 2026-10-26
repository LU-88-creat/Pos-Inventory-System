
import express from "express";

import {
  listPurchases,
  getPurchase,
  addPurchase,
  orderPurchaseController,
  receivePurchaseController,
} from "./purchaseController.js";

import {
  addPurchasePayment,
  listPurchasePayments,
} from "./purchasePaymentController.js";

const router = express.Router();

router.get("/", listPurchases);
router.post("/", addPurchase);

// Order a draft purchase
router.patch("/:id/order", orderPurchaseController);

// Receive goods for an ordered purchase
router.patch("/:id/receive", receivePurchaseController);

// Supplier payment endpoints
router.post("/:id/payments", addPurchasePayment);
router.get("/:id/payments", listPurchasePayments);

// Get purchase details
router.get("/:id", getPurchase);

export default router;
