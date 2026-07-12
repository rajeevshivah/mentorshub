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
  brand: { type: String, enum: ["tech", "meditation"], default: "tech", index: true },
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
  paymentMethod: { type: String, enum: ["razorpay", "upi", "manual"], default: "razorpay" },
  upiTransactionId: { type: String },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
  meetLink: { type: String },
  adminNotes: { type: String },         // private notes (admin only)
  sessionNotes: { type: String },       // notes SHARED with the student after session
  resources: [{                         // files/links shared with the student
    title: String,
    url: String,                        // link, or uploaded file URL
    type: { type: String, enum: ["link", "file"], default: "link" },
    addedAt: { type: Date, default: Date.now },
  }],
  cancelledAt: { type: Date },
  cancelReason: { type: String },

  // ---- Reschedule tracking (Layer 1) ----
  rescheduleCount: { type: Number, default: 0 },
  rescheduleHistory: [{
    fromDate: String,
    fromSlot: String,
    toDate: String,
    toSlot: String,
    by: String,            // "student" | "admin"
    at: { type: Date, default: Date.now },
  }],

  // ---- Reschedule REQUEST (student-initiated, needs admin approval) ----
  rescheduleRequest: {
    status: { type: String, enum: ["none", "pending", "accepted", "rejected"], default: "none" },
    requestedDate: String,
    requestedSlot: String,
    studentMessage: String,   // why they want to move
    adminResponse: String,    // admin's reply on accept/reject
    requestedAt: Date,
    decidedAt: Date,
  },

  // ---- Reminder tracking (Layer 2) ----
  reminderSent: { type: Boolean, default: false },
}, { timestamps: true });

bookingSchema.index({ date: 1, timeSlot: 1, status: 1 });
module.exports = mongoose.model("Booking", bookingSchema);
