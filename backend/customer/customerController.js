
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deactivateCustomer,
} from "./customerModel.js";

// GET /api/customers
export async function listCustomers(req, res) {
  try {
    const search = String(req.query.search || "").trim();

    const customers = await getAllCustomers({ search });

    return res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    console.error("List customers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve customers.",
    });
  }
}

// GET /api/customers/:id
export async function getCustomer(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const customer = await getCustomerById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Get customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve customer.",
    });
  }
}

// POST /api/customers
export async function addCustomer(req, res) {
  try {
    const {
      customer_name,
      phone,
      email,
      address,
    } = req.body;

    if (
      typeof customer_name !== "string" ||
      !customer_name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required.",
      });
    }

    const normalizedName = customer_name.trim();
    const normalizedPhone =
      typeof phone === "string" ? phone.trim() : "";
    const normalizedEmail =
      typeof email === "string" ? email.trim() : "";
    const normalizedAddress =
      typeof address === "string" ? address.trim() : "";

    if (normalizedName.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Customer name cannot exceed 150 characters.",
      });
    }

    if (normalizedPhone.length > 20) {
      return res.status(400).json({
        success: false,
        message: "Phone number cannot exceed 20 characters.",
      });
    }

    if (normalizedEmail.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Email cannot exceed 150 characters.",
      });
    }

    if (
      normalizedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    if (normalizedAddress.length > 255) {
      return res.status(400).json({
        success: false,
        message: "Address cannot exceed 255 characters.",
      });
    }

    const customer = await createCustomer({
      customer_name: normalizedName,
      phone: normalizedPhone,
      email: normalizedEmail,
      address: normalizedAddress,
    });

    return res.status(201).json({
      success: true,
      message: "Customer created successfully.",
      data: customer,
    });
  } catch (error) {
    console.error("Create customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create customer.",
    });
  }
}

// PUT /api/customers/:id
export async function editCustomer(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const {
      customer_name,
      phone,
      email,
      address,
    } = req.body;

    if (
      typeof customer_name !== "string" ||
      !customer_name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required.",
      });
    }

    const normalizedName = customer_name.trim();
    const normalizedPhone =
      typeof phone === "string" ? phone.trim() : "";
    const normalizedEmail =
      typeof email === "string" ? email.trim() : "";
    const normalizedAddress =
      typeof address === "string" ? address.trim() : "";

    if (normalizedName.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Customer name cannot exceed 150 characters.",
      });
    }

    if (normalizedPhone.length > 20) {
      return res.status(400).json({
        success: false,
        message: "Phone number cannot exceed 20 characters.",
      });
    }

    if (normalizedEmail.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Email cannot exceed 150 characters.",
      });
    }

    if (
      normalizedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    if (normalizedAddress.length > 255) {
      return res.status(400).json({
        success: false,
        message: "Address cannot exceed 255 characters.",
      });
    }

    const customer = await updateCustomer(id, {
      customer_name: normalizedName,
      phone: normalizedPhone,
      email: normalizedEmail,
      address: normalizedAddress,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Active customer not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully.",
      data: customer,
    });
  } catch (error) {
    console.error("Update customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update customer.",
    });
  }
}

// PATCH /api/customers/:id/status
export async function changeCustomerStatus(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const deactivated = await deactivateCustomer(id);

    if (!deactivated) {
      return res.status(404).json({
        success: false,
        message: "Active customer not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer deactivated successfully.",
    });
  } catch (error) {
    console.error("Deactivate customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to deactivate customer.",
    });
  }
}
