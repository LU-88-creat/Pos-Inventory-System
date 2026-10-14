
import express from "express";

import {
  listSales,
  getSale,
  addSale,
  completeCashSale,
  cancelSale,
} from "./salesController.js";

const router = express.Router();

router.get("/", listSales);
router.post("/", addSale);
router.patch("/:id/complete-cash", completeCashSale);
router.patch("/:id/cancel", cancelSale);
router.get("/:id", getSale);

export default router;
