// ============================================================
// slotHold — one place that answers "is this slot free?".
//
// A slot is taken if:
//   1. a Booking holds it (confirmed / pending / pending_upi), or
//   2. someone is in Razorpay checkout for it right now
//      (OnlinePayment not yet paid, and holdUntil in the future).
//
// Used by: availability endpoint, UPI bookings, online orders,
// student reschedules, and Razorpay fulfilment.
// ============================================================
const Booking = require("../models/Booking");
const OnlinePayment = require("../models/OnlinePayment");
const { ACTIVE_BOOKING_STATUSES } = require("./bookingConstants");

// Minutes a slot stays reserved after the student opens checkout
const HOLD_MINUTES = 15;

// Booking that holds this date+slot (optionally ignoring one booking
// or the booking created from one online payment)
async function bookingOnSlot(date, timeSlot, { excludeBookingId, excludeOnlinePaymentId } = {}) {
  const q = { date, timeSlot, status: { $in: ACTIVE_BOOKING_STATUSES } };
  if (excludeBookingId) q._id = { $ne: excludeBookingId };
  if (excludeOnlinePaymentId) q.onlinePayment = { $ne: excludeOnlinePaymentId };
  return Booking.findOne(q);
}

// Live checkout hold on this date+slot (optionally ignoring one user's own holds)
async function holdOnSlot(date, timeSlot, { excludeUserId } = {}) {
  const q = {
    status: { $in: ["created", "failed"] },
    holdUntil: { $gt: new Date() },
    "booking.date": date,
    "booking.timeSlot": timeSlot,
  };
  if (excludeUserId) q.user = { $ne: excludeUserId };
  return OnlinePayment.findOne(q);
}

// True if the slot can't be booked by this user right now
async function slotTaken(date, timeSlot, opts = {}) {
  if (await bookingOnSlot(date, timeSlot, opts)) return true;
  if (await holdOnSlot(date, timeSlot, { excludeUserId: opts.excludeUserId })) return true;
  return false;
}

// All times on a date that are held by an open checkout
async function heldTimesOn(date) {
  const holds = await OnlinePayment.find({
    status: { $in: ["created", "failed"] },
    holdUntil: { $gt: new Date() },
    "booking.date": date,
  }).select("booking.timeSlot");
  return holds.map((h) => h.booking.timeSlot);
}

module.exports = { HOLD_MINUTES, bookingOnSlot, holdOnSlot, slotTaken, heldTimesOn };
