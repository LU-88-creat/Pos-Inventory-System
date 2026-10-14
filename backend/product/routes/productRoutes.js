
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

const router = express.Router();

// Categories
router.get("/categories", listCategories);
router.post("/categories", createCategory);

// Read products
router.get("/", listProducts);
router.get("/:id", getProduct);

// Create product
router.post("/", addProduct);

// Update product
router.put("/:id", editProduct);

// Activate or deactivate product
router.patch("/:id/status", changeProductStatus);

// Delete product (soft delete)
router.delete("/:id", removeProduct);

export default router;
