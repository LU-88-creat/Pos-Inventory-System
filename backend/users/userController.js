
import bcrypt from "bcrypt";

import {
  createUser,
  getAllUsers,
  updateUserStatus,
} from "./userModel.js";

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

    if (
      normalizedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
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

    return res.status(201).json({
      success: true,
      message: "Employee account created successfully.",
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