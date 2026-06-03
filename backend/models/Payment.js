const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  razorpayOrderId: { type: String, required: true },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  status: {
    type: String,
    enum: ["created", "paid", "failed", "refunded"],
    default: "created",
  },
  method: { type: String },
  refundId: { type: String },
  refundedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);