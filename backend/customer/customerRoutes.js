
import express from "express";

import {
  listCustomers,
  getCustomer,
  addCustomer,
  editCustomer,
  changeCustomerStatus,
} from "./customerController.js";

import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Require login and administrator/cashier role
router.use(authenticateToken);
router.use(authorizeRoles("administrator", "cashier"));

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
