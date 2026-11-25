
import bcrypt from "bcrypt";
import db from "../config/db.js";
import { createBusiness } from "../models/businessModel.js";
import { createUser } from "../users/userModel.js";
import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import {
  getUserByEmail,
  getUserByUsername,
  getAdministratorsByBusinessId,
} from "../users/userModel.js";
import { getBusinessByEmail } from "../models/businessModel.js";
import { createActivityLog } from "../activityLogs/activityLogModel.js";
import { getMailFrom, getMailTransport } from "../config/mailer.js";
import {
  consumePasswordResetToken,
  deletePasswordResetToken,
  savePasswordResetToken,
} from "./passwordResetModel.js";


export async function login(req, res) {
  try {
    const { business_email, username, password } = req.body;

    // Validate required login fields.
    if (
      typeof business_email !== "string" ||
      typeof password !== "string" ||
      !business_email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Business email and password are required.",
      });
    }

    // Find the business using its registered email.
    const business = await getBusinessByEmail(
      business_email.trim().toLowerCase()
    );

    if (!business || !business.is_active) {
      return res.status(401).json({
        success: false,
        message: "Invalid business email or password.",
      });
    }

    let user;
    let passwordMatches;

    // If a username is supplied, use the existing employee login.
    if (typeof username === "string" && username.trim()) {
      user = await getUserByUsername(
        username.trim(),
        business.id
      );
    } else {
      // The business email identifies the tenant; the password identifies its administrator.
      const administrators = await getAdministratorsByBusinessId(business.id);
      const matchingAdministrators = [];

      for (const administrator of administrators) {
        if (await bcrypt.compare(password, administrator.password_hash)) {
          matchingAdministrators.push(administrator);
        }
      }

      const activeMatches = matchingAdministrators.filter(
        (administrator) => administrator.is_active
      );

      if (activeMatches.length === 1) {
        user = activeMatches[0];
        passwordMatches = true;
      } else if (activeMatches.length === 0 && matchingAdministrators.length === 1) {
        user = matchingAdministrators[0];
        passwordMatches = true;
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid sign-in details.",
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
    if (passwordMatches === undefined) {
      passwordMatches = await bcrypt.compare(password, user.password_hash);
    }

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid sign-in details.",
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
        business_id: business.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "8h",
      }
    );

    // Record successful login.
    try {
      await createActivityLog({
        business_id: business.id,
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
      console.error("Login activity logging error:", logError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        business_id: business.id,
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
    const { business_email, email } = req.body;

    if (
      typeof business_email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(business_email.trim()) ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid business and employee email addresses.",
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

    const business = await getBusinessByEmail(
      business_email.trim().toLowerCase()
    );

    const user = business?.is_active
      ? await getUserByEmail(
          email.trim().toLowerCase(),
          business.id
        )
      : null;

    if (user?.is_active && user.email) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");

      await savePasswordResetToken(
        user.id,
        business.id,
        tokenHash
      );

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      const resetUrl = new URL("/", frontendUrl);
      resetUrl.searchParams.set("resetToken", token);

      try {
        const delivery = await transporter.sendMail({
          from: getMailFrom(),
          to: user.email,
          subject: "Reset your Lux account password",
          text: `Hello ${user.full_name},\n\nUse this link to reset your password. It expires in one hour:\n${resetUrl.toString()}\n\nIf you did not request this, you can ignore this email.`,
          html: `<p>Hello ${user.full_name},</p><p>Use the link below to reset your password. It expires in one hour.</p><p><a href="${resetUrl.toString()}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
        });

        if (!delivery.accepted?.length || delivery.rejected?.length) {
          throw new Error("SMTP server did not accept the reset email recipient.");
        }
      } catch (mailError) {
        await deletePasswordResetToken(tokenHash);
        throw mailError;
      }
    } else {
      console.warn(
        "Password reset email not sent: no active account was found."
      );
    }

    return res.status(200).json({
      success: true,
      message: "If an active account with those details exists, a password reset link has been sent.",
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

export async function registerBusiness(req, res) {
  let connection;

  try {
    const {
      full_name,
      business_name,
      business_email,
      password,
      confirm_password,
    } = req.body;

    // Validate required fields.
    if (
      typeof full_name !== "string" ||
      typeof business_name !== "string" ||
      typeof business_email !== "string" ||
      typeof password !== "string" ||
      typeof confirm_password !== "string" ||
      !full_name.trim() ||
      !business_name.trim() ||
      !business_email.trim() ||
      !password ||
      !confirm_password
    ) {
      return res.status(400).json({
        success: false,
        message: "All registration fields are required.",
      });
    }

    const normalizedEmail = business_email.trim().toLowerCase();

    // Validate email format.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid business email address.",
      });
    }

    // Validate password.
    if (password.length < 12) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 12 characters.",
      });
    }

    if (password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    // Check whether the business email already exists.
    const existingBusiness = await getBusinessByEmail(normalizedEmail);

    if (existingBusiness) {
      return res.status(409).json({
        success: false,
        message: "A business with this email address is already registered.",
      });
    }

    // Generate a private username for the administrator.
    const adminUsername = `admin_${randomBytes(6).toString("hex")}`;

    // Hash the administrator password.
    const passwordHash = await bcrypt.hash(password, 12);

    // Start the registration transaction.
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Create the business.
    const business = await createBusiness(
      {
        business_name: business_name.trim(),
        email: normalizedEmail,
        currency: "KES",
      },
      connection
    );

    // Create the business administrator.
    const admin = await createUser(
      {
        business_id: business.id,
        full_name: full_name.trim(),
        username: adminUsername,
        email: normalizedEmail,
        password_hash: passwordHash,
        role: "administrator",
      },
      connection
    );

    // Commit the registration.
    await connection.commit();

    // Generate a temporary token for subscription plan selection.
    const registrationToken = jwt.sign(
      {
        business_id: business.id,
        purpose: "plan_selection",
      },
        process.env.JWT_SECRET,
      {
        expiresIn: "30m",
      }
    );

    return res.status(201).json({
      success: true,
      message: "Business registered successfully. Please select a subscription plan.",
      registrationToken, 
      business: {
        id: business.id,
        business_name: business.business_name,
        email: business.email,
      },
      administrator: {
        id: admin.id,
        full_name: admin.full_name,
        email: admin.email,
        username: admin.username,
        role: admin.role,
      },
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Registration rollback error:", rollbackError.message);
      }
    }

    console.error("Business registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to complete registration. Please try again.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}