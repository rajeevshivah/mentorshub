const Booking = require("../models/Booking");
const Package = require("../models/Package");
const {
  sendUpiPendingEmail,
  sendUpiConfirmedEmail,
  sendAdminNewBookingEmail,
} = require("../utils/sendEmail");
const { sendRescheduleEmail, sendRescheduleRequestEmail, sendRescheduleDecisionEmail } = require("../utils/sendEmailExtra");

// Slot availability (bookings + live Razorpay checkout holds) and
// blocked dates / 2-hour notice rules
const { slotUnavailableReason } = require("../utils/slotRules");
const { slotTaken } = require("../utils/slotHold");

// UPI reference: letters/digits only, 6–35 chars (UPI UTRs are 12 digits,
// some apps show longer refs). Spaces and dashes are stripped first.
const normalizeUtr = (v) => String(v || "").replace(/[\s-]/g, "").toUpperCase();
const UTR_RX = /^[A-Z0-9]{6,35}$/;

// ============================================================
// CREATE BOOKING — manual UPI only.
// Online (Razorpay) bookings are created by routes/razorpay.js after
// the payment is verified; they never come through here.
// - price is recomputed from the DB package (never trusted from client)
// - the same UTR can't be used for two live bookings
// - slot conflict covers bookings AND open Razorpay checkouts
// ============================================================
exports.createBooking = async (req, res) => {
  try {
    const { packageId, date, timeSlot, studentInfo, paymentMethod } = req.body;

    if (!packageId || !date || !timeSlot) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }
    if (paymentMethod && paymentMethod !== "upi") {
      return res.status(400).json({ success: false, error: "Online payments go through checkout. Please refresh the page and try again." });
    }

    const utr = normalizeUtr(req.body.upiTransactionId);
    if (!UTR_RX.test(utr)) {
      return res.status(400).json({ success: false, error: "Please enter a valid UPI transaction ID (the 12-digit UTR / reference number from your UPI app)" });
    }
    const utrUsed = await Booking.findOne({ upiTransactionId: utr, status: { $ne: "cancelled" } });
    if (utrUsed) {
      return res.status(409).json({ success: false, error: "This UPI transaction ID has already been used for another booking. Please check it, or email rajeev@rajeevshivah.me" });
    }

    // ---- 1. Resolve the package from the DB (authoritative price/name) ----
    const pkg = await Package.findById(packageId);
    if (!pkg || !pkg.active) {
      return res.status(400).json({ success: false, error: "Invalid or inactive package" });
    }

    // ---- 2. Slot conflict ----
    const conflict = await slotTaken(date, timeSlot, { excludeUserId: req.user._id });
    if (conflict) {
      return res.status(409).json({
        success: false,
        error: "This slot is already booked. Please choose another time.",
      });
    }

    // Blocked dates/slots + 2-hour same-day notice, enforced server-side
    // so a stale browser tab can't book around the rules.
    const unavailable = await slotUnavailableReason(date, timeSlot);
    if (unavailable) {
      return res.status(409).json({ success: false, error: unavailable });
    }

    // UPI — admin verifies manually, then confirms with a Meet link
    const booking = await Booking.create({
      user: req.user.id,
      packageId: String(pkg._id),
      packageName: pkg.name,         // from DB, not client
      packagePrice: pkg.price,       // from DB, not client
      packageDuration: pkg.duration, // from DB, not client
      brand: pkg.brand || "tech",    // from DB, not client
      date, timeSlot, studentInfo,
      meetLink: null,                // set per-booking by admin on confirm
      status: "pending_upi",
      paymentMethod: "upi",
      upiTransactionId: utr,
    });

    // Emails (fire-and-forget)
    if (studentInfo?.email) {
      sendUpiPendingEmail(studentInfo.email, booking).catch((e) =>
        console.error("Email error:", e.message));
    }
    if (process.env.ADMIN_EMAIL) {
      sendAdminNewBookingEmail(process.env.ADMIN_EMAIL, booking).catch((e) =>
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
    const { date, timeSlot, message, meetLink } = req.body;
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

    // New slot must be free (bookings + open checkouts)
    const conflict = await slotTaken(date, timeSlot, { excludeBookingId: booking._id });
    if (conflict) {
      return res.status(409).json({ success: false, error: "That slot is already booked" });
    }

    // Students must respect blocks and the 2-hour notice window.
    // Admin reschedules skip this — you coordinate directly with the student.
    if (!isAdmin) {
      const unavailable = await slotUnavailableReason(date, timeSlot);
      if (unavailable) {
        return res.status(409).json({ success: false, error: unavailable });
      }
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
      // Optional new meeting link; empty = keep the existing one
      if (meetLink && meetLink.trim()) booking.meetLink = meetLink.trim();
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
    const { decision, response, meetLink } = req.body;
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
      const conflict = await slotTaken(req_.requestedDate, req_.requestedSlot, { excludeBookingId: booking._id });
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
      // Optional new meeting link on acceptance; empty = keep existing
      if (meetLink && meetLink.trim()) booking.meetLink = meetLink.trim();
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
