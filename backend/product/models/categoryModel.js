
import db from "../../config/db.js";

export async function createCategory(categoryName) {
  const [result] = await db.query(
    "INSERT INTO categories (category_name) VALUES (?)",
    [categoryName]
  );

  const [rows] = await db.query(
    `SELECT id, category_name, description, is_active
     FROM categories
     WHERE id = ?`,
    [result.insertId]
  );

  return rows[0];
}

export async function getAllCategories() {
  const [rows] = await db.query(
    `SELECT id, category_name, description, is_active
     FROM categories
     WHERE is_active = TRUE
     ORDER BY category_name ASC`
  );

  return rows;
}
