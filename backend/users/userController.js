
import bcrypt from "bcrypt";

import {
  createUser,
  getAllUsers,
  updateUserStatus,
  getUserPasswordHash,
  updateUserPassword,
} from "./userModel.js";

import { createActivityLog } from "../activityLogs/activityLogModel.js";
import {
  escapeHtml,
  getMailFrom,
  getMailTransport,
} from "../config/mailer.js";

// List all employee accounts.
export async function listUsers(req, res) {
  try {
    const users = await getAllUsers();

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("List users error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve employee accounts.",
    });
  }
}

// Create a new employee account.
export async function addUser(req, res) {
  try {
    const {
      full_name,
      username,
      email,
      password,
      role,
    } = req.body;

    const allowedRoles = [
      "administrator",
      "cashier",
      "storekeeper",
    ];

    if (
      typeof full_name !== "string" ||
      typeof username !== "string" ||
      typeof password !== "string" ||
      !full_name.trim() ||
      !username.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Full name, username, and password are required.",
      });
    }

    if (password.length < 12) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 12 characters.",
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee role.",
      });
    }

    if (
      email !== undefined &&
      email !== null &&
      typeof email !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Email must be a valid text value.",
      });
    }

    const normalizedEmail = email?.trim().toLowerCase() || null;

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "An employee email address is required to send login credentials.",
      });
    }

    if (
      normalizedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    const transporter = getMailTransport();

    if (!transporter) {
      console.error("Employee credential SMTP settings are not configured.");
      return res.status(503).json({
        success: false,
        message: "Email delivery is not configured. Set up SMTP before creating employee accounts.",
      });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const user = await createUser({
      full_name: full_name.trim(),
      username: username.trim(),
      email: normalizedEmail,
      password_hash,
      role,
    });

    let credentialsEmailSent = true;

    try {
      const loginUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      const safeName = escapeHtml(user.full_name);
      const safeUsername = escapeHtml(user.username);
      const safePassword = escapeHtml(password);
      const safeRole = escapeHtml(user.role);
      const safeLoginUrl = escapeHtml(loginUrl);

      await transporter.sendMail({
        from: getMailFrom(),
        to: user.email,
        subject: "Welcome to 7 to 7 POS — your employee account",
        text: [
          `Hello ${user.full_name},`,
          "",
          "Your employee account is ready. Use the details below to sign in:",
          "",
          `Username: ${user.username}`,
          `Temporary password: ${password}`,
          `Role: ${user.role}`,
          "",
          `Sign in: ${loginUrl}`,
          "",
          "For your security, change your password after signing in. Keep these credentials private and do not forward this email.",
          "",
          "If you were not expecting this account, contact your administrator.",
          "",
          "7 to 7 POS & Inventory",
        ].join("\n"),
        html: `
          <div style="margin:0;padding:32px 16px;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
            <div style="max-width:560px;margin:0 auto;overflow:hidden;border:1px solid #e2e8f0;border-radius:16px;background-color:#ffffff;">
              <div style="padding:28px 32px;background-color:#15803d;color:#ffffff;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:bold;letter-spacing:2px;">7 TO 7 · POS &amp; INVENTORY</p>
                <h1 style="margin:0;font-size:24px;line-height:1.3;">Welcome to the team</h1>
              </div>
              <div style="padding:28px 32px;">
                <p style="margin:0 0 16px;font-size:16px;">Hello ${safeName},</p>
                <p style="margin:0 0 22px;color:#475569;line-height:1.6;">Your employee account is ready. Use these credentials to sign in:</p>
                <div style="margin:0 0 24px;padding:18px 20px;border:1px solid #dcfce7;border-radius:12px;background-color:#f0fdf4;">
                  <p style="margin:0 0 12px;color:#475569;font-size:13px;">USERNAME</p>
                  <p style="margin:0 0 18px;font-size:16px;font-weight:bold;word-break:break-word;">${safeUsername}</p>
                  <p style="margin:0 0 12px;color:#475569;font-size:13px;">TEMPORARY PASSWORD</p>
                  <p style="margin:0 0 18px;font-family:monospace;font-size:16px;font-weight:bold;word-break:break-all;">${safePassword}</p>
                  <p style="margin:0 0 6px;color:#475569;font-size:13px;">ACCOUNT ROLE</p>
                  <p style="margin:0;font-size:14px;font-weight:bold;text-transform:capitalize;">${safeRole}</p>
                </div>
                <p style="margin:0 0 24px;text-align:center;">
                  <a href="${safeLoginUrl}" style="display:inline-block;padding:13px 24px;border-radius:9px;background-color:#15803d;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;">Sign in to your account</a>
                </p>
                <div style="padding:16px;border-left:4px solid #f59e0b;background-color:#fffbeb;color:#78350f;font-size:13px;line-height:1.6;">
                  For your security, change your password after signing in. Keep these credentials private and do not forward this email.
                </div>
                <p style="margin:22px 0 0;color:#64748b;font-size:13px;line-height:1.6;">If you were not expecting this account, contact your administrator.</p>
              </div>
              <div style="padding:18px 32px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;text-align:center;">
                7 to 7 POS &amp; Inventory Management
              </div>
            </div>
          </div>
        `,
      });
    } catch (mailError) {
      credentialsEmailSent = false;
      console.error("Employee credential email error:", mailError.message);
    }

    // Record employee account creation.
    try {
      await createActivityLog({
        user_id: req.user.id,
        employee_name: req.user.full_name,
        username: req.user.username,
        action: "EMPLOYEE_CREATED",
        entity_type: "user",
        entity_id: user.id,
        description: `${req.user.full_name} created employee account for ${user.full_name} (${user.username}) with role ${user.role}.`,
        ip_address: req.ip,
      });
    } catch (logError) {
      // Logging failure must not prevent employee creation.
      console.error("Employee creation activity logging error:", logError.message);
    }

    return res.status(201).json({
      success: true,
      message: credentialsEmailSent
        ? "Employee account created and login credentials emailed successfully."
        : "Employee account was created, but the login credentials email could not be sent. Share the credentials securely with the employee.",
      credentialsEmailSent,
      user,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Username or email already exists.",
      });
    }

    console.error("Create user error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create employee account.",
    });
  }
}

export async function changeUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID.",
      });
    }

    if (is_active !== 0 && is_active !== 1 &&
        is_active !== false && is_active !== true) {
      return res.status(400).json({
        success: false,
        message: "is_active must be 0 or 1.",
      });
    }

    if (Number(id) === req.user.id && !Boolean(is_active)) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account.",
      });
    }

    const user = await updateUserStatus(
      Number(id),
      Number(is_active)
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    // Record the employee status change.
    const newStatus = Number(is_active) === 1 ? "active" : "inactive";

    try {
      await createActivityLog({
        user_id: req.user.id,
        employee_name: req.user.full_name,
        username: req.user.username,
        action: "EMPLOYEE_STATUS_SET",
        entity_type: "user",
        entity_id: user.id,
        description: `${req.user.full_name} set employee account for ${user.full_name} (${user.username}) to ${newStatus}.`,
        ip_address: req.ip,
      });
    } catch (logError) {
      // Logging failure must not prevent the status change.
      console.error("Employee status activity logging error:", logError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Employee status updated successfully.",
      user,
    });
  } catch (error) {
    console.error("Change employee status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update employee status.",
    });
  }
}

// Allow an employee to change their own password.
export async function changePassword(req, res) {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    if (
      typeof current_password !== "string" ||
      typeof new_password !== "string" ||
      !current_password ||
      !new_password
    ) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required.",
      });
    }

    if (new_password.length < 12) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least 12 characters.",
      });
    }

    if (current_password === new_password) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from your current password.",
      });
    }

    const user = await getUserPasswordHash(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Employee account not found.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      current_password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    const newPasswordHash = await bcrypt.hash(new_password, 12);

    const updated = await updateUserPassword(
      userId,
      newPasswordHash
    );

    if (!updated) {
      return res.status(500).json({
        success: false,
        message: "Unable to update password.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Please log in again.",
    });
  } catch (error) {
    console.error("Change password error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to change password.",
    });
  }
}