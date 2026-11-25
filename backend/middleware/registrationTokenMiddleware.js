
import jwt from "jsonwebtoken";
import { getBusinessById } from "../models/businessModel.js";

// Verify temporary tokens issued during business registration.
export async function authenticateRegistrationToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Registration token required.",
      });
    }

    const token = authHeader.slice(7);

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured.");

      return res.status(500).json({
        success: false,
        message: "Authentication service is not configured.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure this is specifically a registration token.
    if (
      !decoded ||
      decoded.purpose !== "plan_selection" ||
      !Number.isSafeInteger(decoded.business_id) ||
      decoded.business_id <= 0
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid registration token.",
      });
    }

    // Confirm that the registered business still exists and is active.
    const business = await getBusinessById(decoded.business_id);

    if (!business || !business.is_active) {
      return res.status(403).json({
        success: false,
        message: "This business account is inactive or unavailable.",
      });
    }

    req.registration = {
      business_id: business.id,
    };

    next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Registration token is invalid or has expired.",
      });
    }

    console.error(
      "Registration token verification error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Unable to verify registration token.",
    });
  }
}
