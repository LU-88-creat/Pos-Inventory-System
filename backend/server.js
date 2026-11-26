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
import { expireStkPushes } from "./sales/mpesaController.js";
import subscriptionRoutes from "./subscriptions/subscriptionRoutes.js";
import {
  processScheduledSubscriptionChanges,
} from "./subscriptions/subscriptionScheduler.js";


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

      const corsError = new Error("This request is not allowed.");
      corsError.status = 403;
      callback(corsError);
    },
  })
);
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
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

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "The requested resource could not be found.",
  });
});

app.use((error, req, res, next) => {
  console.error("Unhandled API error:", error);

  const statusCode =
    Number.isInteger(error?.status) &&
    error.status >= 400 &&
    error.status < 600
      ? error.status
      : 500;

  res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500
        ? "Something went wrong. Please try again."
        : "The request could not be completed.",
  });
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  const expireStkPushesSafely = () => {
    expireStkPushes().catch((error) => {
      console.error("Expire M-Pesa STK prompts error:", error.message);
    });
  };
  expireStkPushesSafely();
  setInterval(expireStkPushesSafely, 15 * 1000);

    const processSubscriptionChangesSafely = () => {
    processScheduledSubscriptionChanges().catch((error) => {
      console.error(
        "Process scheduled subscription changes error:",
        error.message
      );
    });
  };

  processSubscriptionChangesSafely();
  setInterval(processSubscriptionChangesSafely, 60 * 1000);

  db.query("SELECT 1")
    .then(() => console.log("Database connected"))
    .catch((error) => console.error("Database connection failed:", error.message));
});