import express from "express";

import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

import {
  listUsers,
  addUser,
  changeUserName,
  changeUserStatus,
  deleteUser,
  changePassword,
} from "./userController.js";

const router = express.Router();

// All routes require authentication.
router.use(authenticateToken);

// Every authenticated employee can change their own password.
router.patch("/change-password", changePassword);

// Restrict the remaining employee-management routes to administrators.
router.use(authorizeRoles("administrator"));

// Retrieve all employees.
router.get("/", listUsers);

// Create a new employee.
router.post("/", addUser);

// Update an employee's name.
router.patch("/:id", changeUserName);

// Activate or deactivate an employee.
router.patch("/:id/status", changeUserStatus);

// Permanently delete an employee account.
router.delete("/:id", deleteUser);

export default router;