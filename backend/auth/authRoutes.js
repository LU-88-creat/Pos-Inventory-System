
import express from "express";

import {
  login,
  getCurrentUser,
} from "./authController.js";

import {
  authenticateToken,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", login);

// Verify the currently authenticated employee.
router.get("/me", authenticateToken, getCurrentUser);

export default router;
