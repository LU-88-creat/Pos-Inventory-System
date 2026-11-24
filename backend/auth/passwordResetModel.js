import db from "../config/db.js";

// Save a password reset token for an employee within a specific business.
export async function savePasswordResetToken(
  userId,
  businessId,
  tokenHash
) {
  await db.execute(
    `INSERT INTO password_reset_tokens (
       business_id,
       user_id,
       token_hash,
       expires_at
     )
     VALUES (?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 HOUR))
     ON DUPLICATE KEY UPDATE
       business_id = VALUES(business_id),
       token_hash = VALUES(token_hash),
       expires_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 HOUR),
       created_at = CURRENT_TIMESTAMP`,
    [businessId, userId, tokenHash]
  );
}

export async function deletePasswordResetToken(tokenHash) {
  await db.execute(
    `DELETE FROM password_reset_tokens
     WHERE token_hash = ?`,
    [tokenHash]
  );
}

// Consume a password reset token within the employee's business.
export async function consumePasswordResetToken(
  tokenHash,
  passwordHash
) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT user_id, business_id
       FROM password_reset_tokens
       WHERE token_hash = ?
         AND expires_at > CURRENT_TIMESTAMP
       FOR UPDATE`,
      [tokenHash]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return false;
    }

    const { user_id, business_id } = rows[0];

    const [updateResult] = await connection.execute(
      `UPDATE users
       SET password_hash = ?
       WHERE id = ?
         AND business_id = ?`,
      [passwordHash, user_id, business_id]
    );

    if (updateResult.affectedRows !== 1) {
      await connection.rollback();
      return false;
    }

    const [deleteResult] = await connection.execute(
      `DELETE FROM password_reset_tokens
       WHERE token_hash = ?`,
      [tokenHash]
    );

    if (deleteResult.affectedRows !== 1) {
      await connection.rollback();
      return false;
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}