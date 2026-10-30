
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
  listAllPurchasePayments,
} from "./purchasePaymentController.js";

import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// All purchase endpoints require authentication.
router.use(authenticateToken);

// Purchase management: administrator and storekeeper.
router.get(
  "/",
  authorizeRoles("administrator", "storekeeper"),
  listPurchases
);

router.post(
  "/",
  authorizeRoles("administrator", "storekeeper"),
  addPurchase
);

router.patch(
  "/:id/order",
  authorizeRoles("administrator", "storekeeper"),
  orderPurchaseController
);

router.patch(
  "/:id/receive",
  authorizeRoles("administrator", "storekeeper"),
  receivePurchaseController
);

// Supplier payment endpoints: administrator only.
router.get(
  "/payments/history",
  authorizeRoles("administrator"),
  listAllPurchasePayments
);

router.post(
  "/:id/payments",
  authorizeRoles("administrator"),
  addPurchasePayment
);

router.get(
  "/:id/payments",
  authorizeRoles("administrator"),
  listPurchasePayments
);

// Purchase details: administrator and storekeeper.
router.get(
  "/:id",
  authorizeRoles("administrator", "storekeeper"),
  getPurchase
);

export default router;
