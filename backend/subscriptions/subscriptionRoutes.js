import express from "express";

import {
  getPlans,
  selectPlan,
  getCurrentSubscription,
  changeSubscriptionPlan,
} from "./subscriptionController.js";

import {
  authenticateRegistrationToken,
} from "../middleware/registrationTokenMiddleware.js";

import {
  authenticateSubscriptionToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Public endpoint: retrieve available subscription plans.
router.get("/plans", getPlans);

// Protected endpoint: select a plan after business registration.
router.post(
  "/select",
  authenticateRegistrationToken,
  selectPlan
);

// Administrator endpoint: retrieve the current business subscription.
// This remains accessible even if the subscription has expired.
router.get(
  "/current",
  authenticateSubscriptionToken,
  authorizeRoles("administrator"),
  getCurrentSubscription
);

// Administrator endpoint: change the business subscription plan.
router.post(
  "/change-plan",
  authenticateSubscriptionToken,
  authorizeRoles("administrator"),
  changeSubscriptionPlan
);

export default router;