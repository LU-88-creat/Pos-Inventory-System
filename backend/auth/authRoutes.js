
import express from "express";

import {
  login,
  getCurrentUser,
  requestPasswordReset,
  resetPassword,
  registerBusiness,
} from "./authController.js";

import {
  authenticateToken,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", registerBusiness);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);

// Verify the currently authenticated employee.
router.get("/me", authenticateToken, getCurrentUser);

export default router;
