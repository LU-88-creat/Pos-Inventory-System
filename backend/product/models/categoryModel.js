
import db from "../../config/db.js";

// Create a category for a specific business.
export async function createCategory(categoryName, businessId) {
  const [result] = await db.query(
    `INSERT INTO categories (
      business_id,
      category_name
    ) VALUES (?, ?)`,
    [businessId, categoryName]
  );

  const [rows] = await db.query(
    `SELECT
       id,
       business_id,
       category_name,
       description,
       is_active
     FROM categories
     WHERE id = ?
       AND business_id = ?`,
    [result.insertId, businessId]
  );

  return rows[0] || null;
}

// Retrieve categories belonging to a specific business.
export async function getAllCategories(businessId) {
  const [rows] = await db.query(
    `SELECT
       id,
       business_id,
       category_name,
       description,
       is_active
     FROM categories
     WHERE business_id = ?
       AND is_active = TRUE
     ORDER BY category_name ASC`,
    [businessId]
  );

  return rows;
}
