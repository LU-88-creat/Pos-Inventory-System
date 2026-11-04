
import bcrypt from "bcrypt";
import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { getUserByEmail, getUserByUsername } from "../users/userModel.js";
import { createActivityLog } from "../activityLogs/activityLogModel.js";
import { getMailFrom, getMailTransport } from "../config/mailer.js";
import {
  consumePasswordResetToken,
  deletePasswordResetToken,
  savePasswordResetToken,
} from "./passwordResetModel.js";

export async function login(req, res) {
  try {
    const { username, password } = req.body;

    // Validate login fields.
    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required.",
      });
    }

    // Find the employee account.
    const user = await getUserByUsername(username.trim());

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }

    // Check whether the account is active.
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Contact your administrator.",
      });
    }

    // Verify the password.
    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }

    // Ensure the JWT secret is configured.
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured.");

      return res.status(500).json({
        success: false,
        message: "Authentication service is not configured.",
      });
    }

    // Generate authentication token.
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "8h",
      }
    );

    // Record successful employee login.
    try {
      await createActivityLog({
        user_id: user.id,
        employee_name: user.full_name,
        username: user.username,
        action: "LOGIN",
        entity_type: "user",
        entity_id: user.id,
        description: `${user.full_name} logged into the system.`,
        ip_address: req.ip,
      });
    } catch (logError) {
      // An audit-log failure must not prevent a successful login.
      console.error("Login activity logging error:", logError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred during login.",
    });
  }
}

export async function getCurrentUser(req, res) {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
}

export async function requestPasswordReset(req, res) {
  try {
    const { email } = req.body;

    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const transporter = getMailTransport();

    if (!transporter) {
      console.error("Password recovery SMTP settings are not configured.");
      return res.status(503).json({
        success: false,
        message: "Password recovery is not currently available. Contact your administrator.",
      });
    }

    const user = await getUserByEmail(email.trim().toLowerCase());

    if (user?.is_active && user.email) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");

      await savePasswordResetToken(user.id, tokenHash);

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      const resetUrl = new URL("/", frontendUrl);
      resetUrl.searchParams.set("resetToken", token);

      try {
        await transporter.sendMail({
          from: getMailFrom(),
          to: user.email,
          subject: "Reset your POS account password",
          text: `Hello ${user.full_name},\n\nUse this link to reset your password. It expires in one hour:\n${resetUrl.toString()}\n\nIf you did not request this, you can ignore this email.`,
          html: `<p>Hello,</p><p>Use the link below to reset your password. It expires in one hour.</p><p><a href="${resetUrl.toString()}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
        });
      } catch (mailError) {
        await deletePasswordResetToken(tokenHash);
        throw mailError;
      }
    }

    return res.status(200).json({
      success: true,
      message: "If an active account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Password reset request error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to send a password reset link. Please try again later.",
    });
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, new_password } = req.body;

    if (
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/i.test(token) ||
      typeof new_password !== "string" ||
      !new_password
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid reset link and new password are required.",
      });
    }

    if (new_password.length < 12) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 12 characters.",
      });
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const passwordHash = await bcrypt.hash(new_password, 12);
    const updated = await consumePasswordResetToken(tokenHash, passwordHash);

    if (!updated) {
      return res.status(400).json({
        success: false,
        message: "This password reset link is invalid or has expired. Request a new one.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now sign in.",
    });
  } catch (error) {
    console.error("Password reset error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to reset your password. Please try again later.",
    });
  }
}
