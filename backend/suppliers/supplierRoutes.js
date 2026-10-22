
import express from "express";

import {
  listSuppliers,
  getSupplier,
  addSupplier,
  editSupplier,
  changeSupplierStatus,
} from "./supplierController.js";

const router = express.Router();

// List and search suppliers
router.get("/", listSuppliers);

// Retrieve one supplier
router.get("/:id", getSupplier);

// Create a supplier
router.post("/", addSupplier);

// Update supplier details
router.put("/:id", editSupplier);

// Activate or deactivate a supplier
router.patch("/:id/status", changeSupplierStatus);

export default router;
