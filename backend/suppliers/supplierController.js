
import {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  setSupplierStatus,
} from "./supplierModel.js";

const cleanOptional = (value) => {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).trim();
  return cleaned || null;
};

function validateSupplier(body) {
  const supplier_name =
    typeof body.supplier_name === "string"
      ? body.supplier_name.trim()
      : "";

  if (!supplier_name) {
    return { error: "Supplier name is required." };
  }

  if (supplier_name.length > 150) {
    return { error: "Supplier name cannot exceed 150 characters." };
  }

  const fields = [
    ["contact_person", 150],
    ["phone", 20],
    ["email", 150],
    ["address", 255],
    ["tax_number", 50],
    ["notes", 500],
  ];

  for (const [field, maxLength] of fields) {
    const value = cleanOptional(body[field]);

    if (value !== null && value.length > maxLength) {
      return {
        error: `${field.replace("_", " ")} cannot exceed ${maxLength} characters.`,
      };
    }
  }

  const email = cleanOptional(body.email);

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return { error: "Please enter a valid email address." };
  }

  return {
    data: {
      supplier_name,
      contact_person: cleanOptional(body.contact_person),
      phone: cleanOptional(body.phone),
      email,
      address: cleanOptional(body.address),
      tax_number: cleanOptional(body.tax_number),
      notes: cleanOptional(body.notes),
    },
  };
}

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function listSuppliers(req, res) {
  try {
    const search =
      typeof req.query.search === "string" ? req.query.search : "";

    const requestedStatus =
      typeof req.query.status === "string"
        ? req.query.status
        : "all";

    if (!["all", "active", "inactive"].includes(requestedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Status must be all, active, or inactive.",
      });
    }

    const suppliers = await getAllSuppliers({
      search,
      status: requestedStatus,
    });

    return res.json({
      success: true,
      data: suppliers,
    });
  } catch (error) {
    console.error("List suppliers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve suppliers.",
    });
  }
}

export async function getSupplier(req, res) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    const supplier = await getSupplierById(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    return res.json({ success: true, data: supplier });
  } catch (error) {
    console.error("Get supplier error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve supplier.",
    });
  }
}

export async function addSupplier(req, res) {
  try {
    const validation = validateSupplier(req.body ?? {});

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const supplier = await createSupplier(validation.data);

    return res.status(201).json({
      success: true,
      message: "Supplier created successfully.",
      data: supplier,
    });
  } catch (error) {
    console.error("Create supplier error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create supplier.",
    });
  }
}

export async function editSupplier(req, res) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    const validation = validateSupplier(req.body ?? {});

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const supplier = await updateSupplier(id, validation.data);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    return res.json({
      success: true,
      message: "Supplier updated successfully.",
      data: supplier,
    });
  } catch (error) {
    console.error("Update supplier error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update supplier.",
    });
  }
}

export async function changeSupplierStatus(req, res) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    const { is_active } = req.body ?? {};

    if (is_active !== 0 && is_active !== 1 &&
        is_active !== false && is_active !== true) {
      return res.status(400).json({
        success: false,
        message: "is_active must be 0 or 1.",
      });
    }

    const supplier = await setSupplierStatus(
      id,
      Number(is_active)
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    return res.json({
      success: true,
      message: `Supplier ${Number(is_active) ? "activated" : "deactivated"} successfully.`,
      data: supplier,
    });
  } catch (error) {
    console.error("Change supplier status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to change supplier status.",
    });
  }
}
