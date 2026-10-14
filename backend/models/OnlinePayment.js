const mongoose = require("mongoose");

// ============================================================
// OnlinePayment — one document per Razorpay order.
//
// Created when the student clicks "Pay", BEFORE the money moves.
// It carries everything the booking needs (package, date, slot,
// form details) until Razorpay confirms the payment; then the
// Booking is created from it exactly once.
//
// While status is "created" and holdUntil is in the future, the
// slot is held so nobody else can take it mid-checkout.
//
// Separate from the legacy Payment model on purpose: the old
// `payments` collection holds v1 test-mode records with a different
// shape, and a unique orderId index could not be built over them.
// ============================================================
const onlinePaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  brand: { type: String, enum: ["tech", "meditation"], default: "tech", index: true },

  // What was bought (snapshot from the DB at order time)
  package: { type: mongoose.Schema.Types.ObjectId, ref: "Package", required: true },
  packageName: { type: String, required: true },
  packageDuration: { type: String, default: "" },

  amount: { type: Number, required: true },          // rupees
  amountPaise: { type: Number, required: true },     // what Razorpay must charge
  currency: { type: String, default: "INR" },

  orderId: { type: String, required: true, unique: true },   // order_xxx
  paymentId: { type: String, default: "" },                  // pay_xxx
  status: { type: String, enum: ["created", "paid", "failed"], default: "created", index: true },
  method: { type: String, default: "" },                     // upi / card / netbanking / wallet
  international: { type: Boolean, default: false },
  paidAt: { type: Date, default: null },
  failReason: { type: String, default: "" },

  // Booking form, carried until the payment is confirmed
  booking: {
    date: { type: String, required: true },        // "2026-10-20"
    timeSlot: { type: String, required: true },    // "08:00 PM"
    timezone: { type: String, default: "Asia/Kolkata" },
    studentInfo: {
      name: String, email: String, phone: String,
      college: String, year: String, skills: String,
      goals: String, questions: String,
    },
  },
  holdUntil: { type: Date, default: null },          // slot held until this time

  // Result
  bookingRef: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
  lockedAt: { type: Date, default: null },          // fulfilment in progress (verify vs webhook race)

  // Paid, but the slot was taken by the time the money arrived
  // (checkout left open past the hold). Admin reschedules or refunds.
  conflict: { type: Boolean, default: false },
  conflictReason: { type: String, default: "" },
  conflictResolved: { type: Boolean, default: false },
  conflictNote: { type: String, default: "" },
}, { timestamps: true });

onlinePaymentSchema.index({ status: 1, holdUntil: 1, "booking.date": 1 });
onlinePaymentSchema.index({ user: 1, createdAt: -1 });
onlinePaymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model("OnlinePayment", onlinePaymentSchema);
