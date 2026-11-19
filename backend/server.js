import "dotenv/config";

import express from "express";
import cors from "cors";
import db from "./config/db.js";
import productRoutes from "./product/routes/productRoutes.js";
import customerRoutes from "./customer/customerRoutes.js";
import salesRoutes from "./sales/salesRoutes.js";
import stockRoutes from "./stock/stockRoutes.js";
import supplierRoutes from "./suppliers/supplierRoutes.js";
import purchaseRoutes from "./purchases/purchaseRoutes.js";
import authRoutes from "./auth/authRoutes.js";
import userRoutes from "./users/userRoutes.js";
import businessSettingsRoutes from "./settings/businessSettingsRoutes.js";
import activityLogRoutes from "./activityLogs/activityLogRoutes.js";


const app = express();

const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  "https://pos-inventory-system-ten.vercel.app",
  ...configuredOrigins,
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
  })
);
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/products", productRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/settings", businessSettingsRoutes);
app.use("/api/activity-logs", activityLogRoutes);

app.get("/", (req, res) => {
  res.send("POS Inventory API is running");
});

app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT DATABASE() AS databaseName"
    );

    res.json({
      status: "OK",
      database: rows[0].databaseName,
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);
    res.status(500).json({
      status: "ERROR",
      message: "Database connection failed",
    });
  }
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  db.query("SELECT 1")
    .then(() => console.log("Database connected"))
    .catch((error) => console.error("Database connection failed:", error.message));
});