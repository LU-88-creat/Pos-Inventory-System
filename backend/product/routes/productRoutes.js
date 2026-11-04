
import express from "express";

import {
  listProducts,
  getProduct,
  addProduct,
  editProduct,
  changeProductStatus,
  removeProduct,
  listCategories,
  createCategory,
} from "../controllers/productController.js";

import {
  authenticateToken,
  authorizeRoles,
} from "../../middleware/authMiddleware.js";

const router = express.Router();

// All product endpoints require login.
router.use(authenticateToken);

// Read products: administrator, storekeeper and cashier.
router.get(
  "/",
  authorizeRoles("administrator", "storekeeper", "cashier"),
  listProducts
);

// Category management: administrator and storekeeper.
router.get(
  "/categories",
  authorizeRoles("administrator", "storekeeper"),
  listCategories
);

router.get(
  "/:id",
  authorizeRoles("administrator", "storekeeper", "cashier"),
  getProduct
);

router.post(
  "/categories",
  authorizeRoles("administrator", "storekeeper"),
  createCategory
);

// Create product.
router.post(
  "/",
  authorizeRoles("administrator", "storekeeper"),
  addProduct
);

// Update product.
router.put(
  "/:id",
  authorizeRoles("administrator", "storekeeper"),
  editProduct
);

// Activate or deactivate product.
router.patch(
  "/:id/status",
  authorizeRoles("administrator", "storekeeper"),
  changeProductStatus
);

// Delete product (soft delete).
router.delete(
  "/:id",
  authorizeRoles("administrator", "storekeeper"),
  removeProduct
);

export default router;
