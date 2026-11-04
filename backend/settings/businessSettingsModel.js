
import db from "../config/db.js";

export async function getBusinessSettings() {
  const [rows] = await db.execute(
    `SELECT *
     FROM business_settings
     WHERE id = 1
     LIMIT 1`
  );

  return rows[0] || null;
}

export async function updateBusinessSettings(settings) {
  const {
    business_name,
    phone,
    email,
    address,
    currency,
    receipt_header,
    receipt_footer,
    tax_enabled,
    tax_rate,
  } = settings;

  await db.execute(
    `UPDATE business_settings
     SET business_name = ?,
         phone = ?,
         email = ?,
         address = ?,
         currency = ?,
         receipt_header = ?,
         receipt_footer = ?,
         tax_enabled = ?,
         tax_rate = ?
     WHERE id = 1`,
    [
      business_name,
      phone || null,
      email || null,
      address || null,
      currency,
      receipt_header || null,
      receipt_footer || null,
      tax_enabled ? 1 : 0,
      tax_rate,
    ]
  );

  return getBusinessSettings();
}
