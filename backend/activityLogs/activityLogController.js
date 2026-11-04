import db from "../config/db.js";

// Retrieve activity logs for the administrator.
export async function listActivityLogs(req, res) {
  try {
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 50, 1),
      200
    );

    const [logs] = await db.execute(
      `SELECT
        id,
        user_id,
        employee_name,
        username,
        action,
        entity_type,
        entity_id,
        description,
        ip_address,
        created_at
      FROM activity_logs
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
      [limit]
    );

    return res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error("List activity logs error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve activity logs.",
    });
  }
}