
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
} from "../models/productModel.js";

import {
  createCategory as insertCategory,
  getAllCategories,
} from "../models/categoryModel.js";

const allowedUnits = [
  "piece",
  "kg",
  "g",
  "litre",
  "ml",
  "pack",
  "bottle",
  "box",
  "dozen",
];

function validateProduct(data) {
  const requiredFields = [
    "product_name",
    "sku",
    "category_id",
    "unit_of_measure",
    "cost_price",
    "selling_price",
    "stock_quantity",
    "reorder_level",
  ];

  const missingFields = requiredFields.filter(
    (field) =>
      data[field] === undefined ||
      data[field] === null ||
      data[field] === ""
  );

  if (missingFields.length > 0) {
    return `Missing required fields: ${missingFields.join(", ")}`;
  }

  if (
    typeof data.product_name !== "string" ||
    !data.product_name.trim()
  ) {
    return "Product name must be a non-empty string.";
  }

  if (typeof data.sku !== "string" || !data.sku.trim()) {
    return "SKU must be a non-empty string.";
  }

  if (
    data.barcode !== undefined &&
    data.barcode !== null &&
    typeof data.barcode !== "string"
  ) {
    return "Barcode must be a string or null.";
  }

  if (
    !Number.isInteger(Number(data.category_id)) ||
    Number(data.category_id) <= 0
  ) {
    return "Category ID must be a positive integer.";
  }

  if (!allowedUnits.includes(data.unit_of_measure)) {
    return `Unit must be one of: ${allowedUnits.join(", ")}.`;
  }

  for (const field of [
    "cost_price",
    "selling_price",
    "stock_quantity",
    "reorder_level",
  ]) {
    const value = data[field];

    if (
      typeof value === "boolean" ||
      value === null ||
      value === "" ||
      !Number.isFinite(Number(value)) ||
      Number(value) < 0
    ) {
      return `${field} must be a valid non-negative number.`;
    }
  }

  return null;
}

function normalizeProduct(data) {
  return {
    product_name: data.product_name.trim(),
    sku: data.sku.trim(),
    barcode: data.barcode?.trim() || null,
    category_id: Number(data.category_id),
    unit_of_measure: data.unit_of_measure,
    cost_price: Number(data.cost_price),
    selling_price: Number(data.selling_price),
    stock_quantity: Number(data.stock_quantity),
    reorder_level: Number(data.reorder_level),
  };
}

function handleDatabaseError(error, res) {
  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      success: false,
      message: "A product with this SKU or barcode already exists.",
    });
  }

  if (
    error.code === "ER_NO_REFERENCED_ROW_2" ||
    error.code === "ER_NO_REFERENCED_ROW"
  ) {
    return res.status(400).json({
      success: false,
      message: "The selected category does not exist.",
    });
  }

  console.error("Product API error:", error.message);

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
}

export async function listProducts(req, res) {
  try {
    const { search = "", categoryId = "" } = req.query;

    const products = await getAllProducts({
      search: String(search),
      categoryId: String(categoryId),
    });

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    return handleDatabaseError(error, res);
  }
}

export async function getProduct(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Product ID must be a positive integer.",
      });
    }

    const product = await getProductById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    return handleDatabaseError(error, res);
  }
}

export async function addProduct(req, res) {
  try {
    const validationError = validateProduct(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const product = await createProduct(normalizeProduct(req.body));

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      data: product,
    });
  } catch (error) {
    return handleDatabaseError(error, res);
  }
}

export async function editProduct(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Product ID must be a positive integer.",
      });
    }

    const validationError = validateProduct(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const existing = await getProductById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const product = await updateProduct(
      id,
      normalizeProduct(req.body)
    );

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      data: product,
    });
  } catch (error) {
    return handleDatabaseError(error, res);
  }
}

export async function changeProductStatus(req, res) {
  try {
    const id = Number(req.params.id);
    const { is_active } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Product ID must be a positive integer.",
      });
    }

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_active must be true or false.",
      });
    }

    const existing = await getProductById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const product = await updateProductStatus(id, is_active);

    return res.status(200).json({
      success: true,
      message: `Product ${is_active ? "activated" : "deactivated"} successfully.`,
      data: product,
    });
  } catch (error) {
    return handleDatabaseError(error, res);
  }
}

export async function listCategories(req, res) {
  try {
    const categories = await getAllCategories();

    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    return handleDatabaseError(error, res);
  }
}

export async function createCategory(req, res) {
  const categoryName = req.body.category_name;

  if (typeof categoryName !== "string" || !categoryName.trim()) {
    return res.status(400).json({
      success: false,
      message: "Category name is required.",
    });
  }

  try {
    const category = await insertCategory(categoryName.trim());

    return res.status(201).json({
      success: true,
      message: "Category created successfully.",
      data: category,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "A category with this name already exists.",
      });
    }

    return handleDatabaseError(error, res);
  }
}

export async function removeProduct(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Product ID must be a positive integer.",
      });
    }

    const existing = await getProductById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const product = await deleteProduct(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deactivated successfully.",
      data: product,
    });
  } catch (error) {
    console.error("Delete product error:", error.message);

    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred.",
    });
  }
}