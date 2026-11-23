
import db from "../config/db.js";

// Find a business using its registered email address.
export async function getBusinessByEmail(email) {
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
}
