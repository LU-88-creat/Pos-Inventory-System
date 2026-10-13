import express from "express";
import cors from "cors";
import db from "./config/db.js";
import productRoutes from "./product/routes/productRoutes.js";

const app = express();

app.use(cors({ origin: "http://localhost:5174" }));
app.use(express.json());

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

app.use("/api/products", productRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});