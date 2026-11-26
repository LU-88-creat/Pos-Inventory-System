
import jwt from "jsonwebtoken";
import { getUserById } from "../users/userModel.js";
import { getBusinessById } from "../models/businessModel.js";
import { getBusinessSubscription } from "../models/subscriptionModel.js";

const TRANSIENT_DATABASE_ERRORS = new Set([
  "ECONNRESET",
  "PROTOCOL_CONNECTION_LOST",
  "ETIMEDOUT",
  "EPIPE",
]);

// Create authentication middleware with optional subscription enforcement.
function createAuthenticateToken(requireActiveSubscription = true) {
  return async function authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Authentication required. Please log in.",
        });
      }

      const token = authHeader.split(" ")[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Authentication token is missing.",
        });
      }

      if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is not configured.");

        return res.status(500).json({
          success: false,
          message: "Authentication service is not configured.",
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (
        !decoded ||
        typeof decoded !== "object" ||
        !Number.isSafeInteger(decoded.id) ||
        decoded.id <= 0 ||
        !Number.isSafeInteger(decoded.business_id) ||
        decoded.business_id <= 0
      ) {
        return res.status(401).json({
          success: false,
          message: "Invalid authentication token. Please log in again.",
        });
      }

      // Confirm that the business exists and is active.
      const business = await getBusinessById(decoded.business_id);

      if (!business || !business.is_active) {
        return res.status(403).json({
          success: false,
          message:
            "This business account is inactive. Please contact Lux support.",
        });
      }
      let subscription = null;

      // Check subscription access only when required.
if (requireActiveSubscription) {
  subscription = await getBusinessSubscription(
    decoded.business_id
  );

  if (!subscription || !subscription.has_access) {
    return res.status(403).json({
      success: false,
      message:
        "Your Lux subscription is inactive or has expired. Please renew your subscription or contact Lux support.",
    });
  }
}

      // Confirm that the employee account exists and is active.
      const user = await getUserById(
        decoded.id,
        decoded.business_id
      );

      if (!user || !user.is_active) {
        return res.status(401).json({
          success: false,
          message:
            "Your account is no longer active. Please contact your administrator.",
        });
      }

      req.user = {
  id: user.id,
  business_id: user.business_id,
  full_name: user.full_name,
  username: user.username,
  email: user.email,
  role: user.role,
  subscription: subscription
    ? {
        plan_id: subscription.plan_id,
        plan_code: subscription.plan_code,
        plan_name: subscription.plan_name,
        enabled_features: subscription.enabled_features || [],
      }
    : null,
};

      next();
    } catch (error) {
      if (
        error.name === "TokenExpiredError" ||
        error.name === "JsonWebTokenError"
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid or expired authentication token. Please log in again.",
        });
      }

      if (TRANSIENT_DATABASE_ERRORS.has(error.code)) {
        console.error(
          "Authentication database connection error:",
          error.message
        );

        return res.status(503).json({
          success: false,
          message:
            "Authentication is temporarily unavailable. Please try again.",
        });
      }

      console.error("Authentication middleware error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Authentication failed due to a server error.",
      });
    }
  };
}

// Normal authentication: requires an accessible subscription.
export const authenticateToken = createAuthenticateToken(true);

// Subscription management: allows access even when subscription has expired.
export const authenticateSubscriptionToken =
  createAuthenticateToken(false);

// Restrict access to specific employee roles.
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. You do not have permission to perform this action.",
      });
    }

    next();
  };
}


// Restrict access to features included in the business subscription.
export function authorizeFeature(featureCode) {
  return (req, res, next) => {
    if (!req.user || !req.user.subscription) {
      return res.status(403).json({
        success: false,
        message: "An active subscription is required to access this feature.",
      });
    }

    const enabledFeatures =
      req.user.subscription.enabled_features || [];

    if (!enabledFeatures.includes(featureCode)) {
      return res.status(403).json({
        success: false,
        message:
          "This feature is not included in your current Lux subscription. Please upgrade your plan to access it.",
      });
    }

    next();
  };
}
