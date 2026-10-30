
import express from "express";

import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

import {
  listUsers,
  addUser,
  changeUserStatus,
} from "./userController.js";

const router = express.Router();

// Protect all employee-management routes.
router.use(authenticateToken);
router.use(authorizeRoles("administrator"));

// Retrieve all employees.
router.get("/", listUsers);

// Create a new employee.
router.post("/", addUser);

router.patch("/:id/status", changeUserStatus);

export default router;
