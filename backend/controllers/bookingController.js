const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Package = require("../models/Package");
const { ACTIVE_BOOKING_STATUSES } = require("../utils/bookingConstants");
const {
  sendBookingConfirmation,
  sendUpiPendingEmail,
  sendUpiConfirmedEmail,
} = require("../utils/sendEmail");
const { sendRescheduleEmail, sendRescheduleRequestEmail, sendRescheduleDecisionEmail } = require("../utils/sendEmailExtra");

// Helper: is this slot already taken on this date?
async function slotTaken(date, timeSlot, excludeId = null) {
  const query = {
    date,
    timeSlot,
    status: { $in: ACTIVE_BOOKING_STATUSES },
  };
  if (excludeId) query._id = { $ne: excludeId };
  return await Booking.findOne(query);
}

// ============================================================
// CREATE BOOKING  (hardened)
// - price is recomputed from the DB package (never trusted from client)
// - for razorpay: the referenced payment MUST be `paid` AND owned by user
// - slot conflict uses the shared ACTIVE_BOOKING_STATUSES set
// ============================================================
exports.createBooking = async (req, res) => {
  try {
    const {
      packageId, date, timeSlot, studentInfo, paymentId,
      paymentMethod, upiTransactionId, brand,
    } = req.body;

    if (!packageId || !date || !timeSlot) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    // ---- 1. Resolve the package from the DB (authoritative price/name) ----
    const pkg = await Package.findById(packageId);
    if (!pkg || !pkg.active) {
      return res.status(400).json({ success: false, error: "Invalid or inactive package" });
    }

    // ---- 2. Slot conflict ----
    const conflict = await slotTaken(date, timeSlot);
    if (conflict) {
      return res.status(409).json({
        success: false,
        error: "This slot is already booked. Please choose another time.",
      });
    }

    const method = paymentMethod === "upi" ? "upi" : "razorpay";
    let status;

    if (method === "razorpay") {
      // ---- 3. Verify the payment is real, paid, and belongs to this user ----
      if (!paymentId) {
        return res.status(400).json({ success: false, error: "Missing payment reference" });
      }
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        return res.status(400).json({ success: false, error: "Payment not found" });
      }
      if (payment.user.toString() !== req.user.id) {
        return res.status(403).json({ success: false, error: "Payment does not belong to you" });
      }
      if (payment.status !== "paid") {
        return res.status(400).json({ success: false, error: "Payment not completed" });
      }
      // amount paid must match the package price (in paise)
      if (payment.amount !== Math.round(pkg.price * 100)) {
        return res.status(400).json({ success: false, error: "Payment amount mismatch" });
      }
      status = "confirmed";
    } else {
      // UPI — admin verifies manually later
      status = "pending_upi";
    }

    const booking = await Booking.create({
      user: req.user.id,
      packageId: String(pkg._id),
      packageName: pkg.name,         // from DB, not client
      packagePrice: pkg.price,       // from DB, not client
      packageDuration: pkg.duration, // from DB, not client
      brand: brand || pkg.brand || "tech",
      date, timeSlot, studentInfo,
      payment: paymentId || null,
      meetLink: null,                // set per-booking by admin on confirm
      status,
      paymentMethod: method,
      upiTransactionId: method === "upi" ? (upiTransactionId || null) : null,
    });

    // Link payment -> booking
    if (paymentId) {
      await Payment.findByIdAndUpdate(paymentId, { booking: booking._id });
    }

    // Emails (fire-and-forget)
    if (status === "confirmed") {
      sendBookingConfirmation(studentInfo.email, booking).catch((e) =>
        console.error("Email error:", e.message));
    } else {
      sendUpiPendingEmail(studentInfo.email, booking).catch((e) =>
        console.error("Email error:", e.message));
    }

    res.status(201).json({ success: true, booking });
  } catch (err) {
    console.error("Create booking error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ---- Get current user's bookings ----
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ---- Cancel booking (owner only) ----
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: "Booking not found" });
    if (booking.user.toString() !== req.user.id)
      return res.status(403).json({ success: false, error: "Not authorized" });
    if (["cancelled", "completed"].includes(booking.status))
      return res.status(400).json({ success: false, error: `Cannot cancel a ${booking.status} booking` });

    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    booking.cancelReason = req.body.reason || "Cancelled by student";
    await booking.save();

    // Let the mentor know a student cancelled (non-blocking).
    if (process.env.ADMIN_EMAIL) {
      try {
        const { sendStudentCancelledEmail } = require("../utils/sendEmailExtra");
        await sendStudentCancelledEmail(process.env.ADMIN_EMAIL, booking, booking.cancelReason);
      } catch (emailErr) {
        console.error("⚠️ Admin cancel-notice email failed:", emailErr.message);
      }
    }

    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// RESCHEDULE  (Layer 1) — student (owner) OR admin
// Checks the new slot is free, records history, emails the student.
// ============================================================
exports.rescheduleBooking = async (req, res) => {
  try {
    const { date, timeSlot, message } = req.body;
    if (!date || !timeSlot) {
      return res.status(400).json({ success: false, error: "New date and time required" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: "Booking not found" });

    const isOwner = booking.user.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    if (["cancelled", "completed"].includes(booking.status)) {
      return res.status(400).json({ success: false, error: `Cannot reschedule a ${booking.status} booking` });
    }

    if (booking.date === date && booking.timeSlot === timeSlot) {
      return res.status(400).json({ success: false, error: "That's the same slot" });
    }

    // New slot must be free
    const conflict = await slotTaken(date, timeSlot, booking._id);
    if (conflict) {
      return res.status(409).json({ success: false, error: "That slot is already booked" });
    }

    // ---- ADMIN: reschedule takes effect immediately ----
    if (isAdmin) {
      const from = { date: booking.date, slot: booking.timeSlot };
      booking.rescheduleHistory.push({
        fromDate: from.date, fromSlot: from.slot,
        toDate: date, toSlot: timeSlot, by: "admin",
      });
      booking.rescheduleCount += 1;
      booking.date = date;
      booking.timeSlot = timeSlot;
      booking.reminderSent = false;
      // clear any pending student request since admin acted directly
      if (booking.rescheduleRequest?.status === "pending") {
        booking.rescheduleRequest.status = "accepted";
        booking.rescheduleRequest.decidedAt = new Date();
      }
      await booking.save();
      if (booking.studentInfo?.email) {
        sendRescheduleEmail(booking.studentInfo.email, booking, from).catch((e) =>
          console.error("Email error:", e.message));
      }
      return res.json({ success: true, booking });
    }

    // ---- STUDENT: create a request that needs admin approval ----
    if (booking.rescheduleRequest?.status === "pending") {
      return res.status(400).json({ success: false, error: "You already have a pending reschedule request for this booking" });
    }

    booking.rescheduleRequest = {
      status: "pending",
      requestedDate: date,
      requestedSlot: timeSlot,
      studentMessage: (message || "").trim(),
      adminResponse: "",
      requestedAt: new Date(),
    };
    await booking.save();

    // notify admin (reuse the reschedule email util to the admin address if set)
    if (process.env.ADMIN_EMAIL) {
      sendRescheduleRequestEmail(process.env.ADMIN_EMAIL, booking).catch((e) =>
        console.error("Email error:", e.message));
    }

    res.json({ success: true, booking, requested: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// ADMIN: accept or reject a student's reschedule request
// body: { decision: "accept" | "reject", response: "..." }
// ============================================================
exports.respondToReschedule = async (req, res) => {
  try {
    const { decision, response } = req.body;
    if (!["accept", "reject"].includes(decision)) {
      return res.status(400).json({ success: false, error: "decision must be accept or reject" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: "Booking not found" });
    if (booking.rescheduleRequest?.status !== "pending") {
      return res.status(400).json({ success: false, error: "No pending reschedule request" });
    }

    const req_ = booking.rescheduleRequest;

    if (decision === "accept") {
      // make sure the requested slot is still free
      const conflict = await slotTaken(req_.requestedDate, req_.requestedSlot, booking._id);
      if (conflict) {
        return res.status(409).json({ success: false, error: "Requested slot is no longer available" });
      }
      const from = { date: booking.date, slot: booking.timeSlot };
      booking.rescheduleHistory.push({
        fromDate: from.date, fromSlot: from.slot,
        toDate: req_.requestedDate, toSlot: req_.requestedSlot, by: "student",
      });
      booking.rescheduleCount += 1;
      booking.date = req_.requestedDate;
      booking.timeSlot = req_.requestedSlot;
      booking.reminderSent = false;
      req_.status = "accepted";
    } else {
      req_.status = "rejected";
    }
    req_.adminResponse = (response || "").trim();
    req_.decidedAt = new Date();
    await booking.save();

    if (booking.studentInfo?.email) {
      sendRescheduleDecisionEmail(booking.studentInfo.email, booking, decision).catch((e) =>
        console.error("Email error:", e.message));
    }

    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// ADMIN: Confirm UPI booking — now requires a per-booking meet link
// ============================================================
exports.confirmUpiBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: "Booking not found" });
    if (booking.status !== "pending_upi")
      return res.status(400).json({ success: false, error: "Booking is not pending UPI" });

    const meetLink = (req.body.meetLink || "").trim();
    if (!meetLink) {
      return res.status(400).json({ success: false, error: "A Google Meet link is required to confirm" });
    }

    booking.status = "confirmed";
    booking.meetLink = meetLink;
    await booking.save();

    sendUpiConfirmedEmail(booking.studentInfo.email, booking).catch((e) =>
      console.error("Email error:", e.message));

    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// ADMIN: Mark a booking completed (Layer / feature)
// ============================================================
exports.completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: "Booking not found" });
    if (booking.status !== "confirmed")
      return res.status(400).json({ success: false, error: "Only confirmed bookings can be completed" });

    booking.status = "completed";
    if (req.body.sessionNotes !== undefined) booking.sessionNotes = req.body.sessionNotes;
    await booking.save();
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
