
import db from "../../config/db.js";

export async function getAllCategories() {
  const [rows] = await db.query(
    `SELECT id, category_name, description, is_active
     FROM categories
     WHERE is_active = TRUE
     ORDER BY category_name ASC`
  );

  return rows;
}
