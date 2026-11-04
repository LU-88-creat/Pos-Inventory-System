import express from "express";

import {
  fetchBusinessSettings,
  saveBusinessSettings,
} from "./bussinessSettingsController.js";

import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Only administrators can access business settings.
router.use(authenticateToken);
router.use(authorizeRoles("administrator"));

router.get("/business", fetchBusinessSettings);
router.put("/business", saveBusinessSettings);

export default router;