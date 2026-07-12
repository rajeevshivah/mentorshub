const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment, refundPayment } = require("../controllers/paymentController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.post("/create-order", protect, createOrder);
router.post("/verify", protect, verifyPayment);
router.put("/:id/refund", protect, adminOnly, refundPayment);   // Layer 3

module.exports = router;
