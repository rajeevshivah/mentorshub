const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  packageId: { type: String, required: true },
  packageName: { type: String, required: true },
  packagePrice: { type: Number, required: true },
  packageDuration: { type: String, required: true },
  date: { type: String, required: true },
  timeSlot: { type: String, required: true },
  timezone: { type: String, default: "Asia/Kolkata" },
  studentInfo: {
    name: String, email: String, phone: String,
    college: String, year: String, skills: String,
    goals: String, questions: String,
  },
status: {
  type: String,
  enum: ["pending", "confirmed", "completed", "cancelled", "rescheduled", "pending_upi"],
  default: "pending",
},
paymentMethod: { type: String, enum: ["razorpay", "upi"], default: "razorpay" },
upiTransactionId: { type: String },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
  meetLink: { type: String },
  adminNotes: { type: String },
  cancelledAt: { type: Date },
  cancelReason: { type: String },
}, { timestamps: true });

bookingSchema.index({ date: 1, timeSlot: 1, status: 1 });
module.exports = mongoose.model("Booking", bookingSchema);