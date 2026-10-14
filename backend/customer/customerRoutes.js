
import express from "express";

import {
  listCustomers,
  getCustomer,
  addCustomer,
  editCustomer,
  changeCustomerStatus,
} from "./customerController.js";

const router = express.Router();

// Get all active customers; supports ?search=
router.get("/", listCustomers);

// Get one customer by ID
router.get("/:id", getCustomer);

// Create a customer
router.post("/", addCustomer);

// Update a customer
router.put("/:id", editCustomer);

// Deactivate a customer
router.patch("/:id/status", changeCustomerStatus);

export default router;
