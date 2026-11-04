import express from "express";

import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

import { listActivityLogs } from "./activityLogController.js";

const router = express.Router();

// Only authenticated administrators can view activity logs.
router.use(authenticateToken);
router.use(authorizeRoles("administrator"));

router.get("/", listActivityLogs);

export default router;