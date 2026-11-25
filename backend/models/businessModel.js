
import db from "../config/db.js";

// Find a business using its registered email address.
export async function getBusinessByEmail(email) {
  try {
    const [rows] = await db.execute(
      `SELECT
         id,
         business_name,
         email,
         is_active,
         subscription_status
       FROM businesses
       WHERE LOWER(email) = LOWER(?)
       LIMIT 2`,
      [email]
    );

    // Refuse ambiguous matches rather than selecting the wrong business.
    if (rows.length > 1) {
      throw new Error("Business email is not unique.");
    }

    return rows[0] || null;
  } catch (error) {
    if (error.code !== "ER_NO_SUCH_TABLE") {
      throw error;
    }

    // Legacy databases store the business in business_settings.
    const [rows] = await db.execute(
      `SELECT
         id,
         business_name,
         email
       FROM business_settings
       WHERE LOWER(email) = LOWER(?)
       LIMIT 2`,
      [email]
    );

    if (rows.length > 1) {
      throw new Error("Business email is not unique.");
    }

    return rows[0]
      ? { ...rows[0], is_active: 1, subscription_status: "active" }
      : null;
  }
}

// Find a business using its ID.
export async function getBusinessById(businessId, connection = db) {
  const [rows] = await connection.execute(
    `SELECT
       id,
       business_name,
       is_active,
       subscription_status
     FROM businesses
     WHERE id = ?
     LIMIT 1`,
    [businessId]
  );

  return rows[0] || null;
}

// Create a new business using a supplied database connection.
export async function createBusiness(businessData, connection = db) {
  const {
    business_name,
    email,
    currency = "KES",
  } = businessData;

  const [result] = await connection.execute(
    `INSERT INTO businesses (
      business_name,
      email,
      currency,
      subscription_status,
      is_active
    ) VALUES (?, ?, ?, 'trial', 1)`,
    [business_name, email, currency]
  );

  return getBusinessById(result.insertId, connection);
}