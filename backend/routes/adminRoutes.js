const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Slot = require("../models/Slot");
const Package = require("../models/Package");
const { ACTIVE_BOOKING_STATUSES } = require("../utils/bookingConstants");

router.use(protect, adminOnly);

// ---- DASHBOARD STATS ----
router.get("/stats", async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const confirmed = await Booking.countDocuments({ status: "confirmed" });
    const completed = await Booking.countDocuments({ status: "completed" });
    const cancelled = await Booking.countDocuments({ status: "cancelled" });
    const payments = await Payment.find({ status: "paid" });
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount / 100, 0);
    res.json({
      success: true,
      stats: { totalBookings, confirmed, completed, cancelled, totalRevenue },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- TODAY'S SESSIONS (the screen you open every morning) ----
router.get("/today", async (req, res) => {
  try {
    const today = new Date();
    const istOffsetMin = 330;
    const istNow = new Date(today.getTime() + istOffsetMin * 60000);
    const dateStr = istNow.toISOString().split("T")[0];
    const bookings = await Booking.find({
      date: dateStr,
      status: { $in: ["confirmed", "pending_upi"] },
    }).sort("timeSlot");
    res.json({ success: true, date: dateStr, bookings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- ALL BOOKINGS (with optional search q + status filter) ----
router.get("/bookings", async (req, res) => {
  try {
    const { q, status } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (q) {
      const rx = new RegExp(q.trim(), "i");
      filter.$or = [
        { "studentInfo.name": rx },
        { "studentInfo.email": rx },
        { "studentInfo.phone": rx },
        { packageName: rx },
      ];
    }
    const bookings = await Booking.find(filter)
      .populate("user", "name email phone")
      .populate("payment", "status razorpayPaymentId method amount")
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- UPDATE BOOKING (status / meetLink / notes) ----
// FIX 1: only whitelisted fields can be updated (previously req.body was
// passed straight to findByIdAndUpdate — mass assignment risk).
// FIX 2: when the admin cancels a booking, the student now gets an email.
// Previously cancellation was silent, which is bad for a paid platform.
router.put("/bookings/:id", async (req, res) => {
  try {
    const ALLOWED = ["status", "meetLink", "adminNotes", "sessionNotes"];
    const update = {};
    for (const key of ALLOWED) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    if (update.status === "cancelled") {
      update.cancelledAt = new Date();
      update.cancelReason = req.body.reason || "Cancelled by mentor";
    }

    const booking = await Booking.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!booking) return res.status(404).json({ success: false, error: "Booking not found" });

    // Email the student on cancellation. Failure to send must not fail
    // the request — the status change already succeeded.
    if (update.status === "cancelled") {
      const studentEmail = booking.studentInfo?.email;
      if (studentEmail) {
        try {
          const { sendCancellationEmail } = require("../utils/sendEmailExtra");
          await sendCancellationEmail(studentEmail, booking, update.cancelReason);
        } catch (emailErr) {
          console.error("⚠️ Cancellation email failed:", emailErr.message);
        }
      }
    }

    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- SEND NOTE TO STUDENT ----
router.post("/bookings/:id/note", async (req, res) => {
  try {
    const { note } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id, { adminNotes: note }, { new: true });
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- REAL email to the student (also stored as a session note) ----
router.post("/bookings/:id/email", async (req, res) => {
  try {
    const { sendStudentMessage } = require("../utils/sendEmailExtra");
    const { subject, message, saveAsNote } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ success: false, error: "Message is required" });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: "Booking not found" });

    const to = booking.studentInfo?.email;
    if (!to) return res.status(400).json({ success: false, error: "No student email on file" });

    await sendStudentMessage(to, booking.studentInfo?.name, subject, message, booking.resources || []);

    // Optionally surface it in the student's dashboard as a session note.
    // Off by default: emails are often logistics (links, payment, timing)
    // that don't belong in session notes.
    if (saveAsNote) {
      const stamp = new Date().toLocaleDateString("en-IN");
      booking.sessionNotes = (booking.sessionNotes ? booking.sessionNotes + "\n\n" : "")
        + `[${stamp}] ${subject ? subject + ": " : ""}${message}`;
      await booking.save();
    }

    res.json({ success: true, booking });
  } catch (err) {
    console.error("Admin email error:", err.message);
    res.status(500).json({ success: false, error: "Could not send email: " + err.message });
  }
});

// ---- Add a shared resource (link or uploaded file url) ----
router.post("/bookings/:id/resource", async (req, res) => {
  try {
    const { title, url, type } = req.body;
    if (!url?.trim()) return res.status(400).json({ success: false, error: "A URL is required" });
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: "Booking not found" });
    booking.resources.push({ title: title || url, url, type: type === "file" ? "file" : "link" });
    await booking.save();
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- Remove a shared resource ----
router.delete("/bookings/:id/resource/:resourceId", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: "Booking not found" });
    booking.resources = booking.resources.filter(r => r._id.toString() !== req.params.resourceId);
    await booking.save();
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- MANUAL BOOKING (offline / cash / direct UPI) ----
router.post("/bookings/manual", async (req, res) => {
  try {
    const { packageId, date, timeSlot, studentInfo, meetLink, markPaid } = req.body;
    if (!packageId || !date || !timeSlot || !studentInfo?.email) {
      return res.status(400).json({ success: false, error: "package, date, slot and student email required" });
    }
    const pkg = await Package.findById(packageId);
    if (!pkg) return res.status(400).json({ success: false, error: "Invalid package" });

    const conflict = await Booking.findOne({
      date, timeSlot, status: { $in: ACTIVE_BOOKING_STATUSES },
    });
    if (conflict) return res.status(409).json({ success: false, error: "Slot already booked" });

    const booking = await Booking.create({
      user: req.user.id, // attributed to admin; studentInfo holds the real student
      packageId: String(pkg._id),
      packageName: pkg.name,
      packagePrice: pkg.price,
      packageDuration: pkg.duration,
      brand: pkg.brand,
      date, timeSlot, studentInfo,
      meetLink: meetLink || null,
      status: markPaid ? "confirmed" : "pending_upi",
      paymentMethod: "manual",
    });
    res.status(201).json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- ALL PAYMENTS ----
router.get("/payments", async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("user", "name email")
      .populate("booking", "packageName date timeSlot")
      .sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- SLOTS ----
router.get("/slots", async (req, res) => {
  try {
    const slots = await Slot.find().sort("time");
    res.json({ success: true, slots });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.post("/slots", async (req, res) => {
  try {
    const { time } = req.body;
    const existing = await Slot.findOne({ time });
    if (existing) return res.status(400).json({ success: false, error: "Slot already exists" });
    const slot = await Slot.create({ time });
    res.status(201).json({ success: true, slot });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.put("/slots/:id", async (req, res) => {
  try {
    const slot = await Slot.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, slot });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.delete("/slots/:id", async (req, res) => {
  try {
    await Slot.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Slot removed" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- STUDENTS ----
router.get("/students", async (req, res) => {
  try {
    const User = require("../models/User");
    const students = await User.find({ role: "student" })
      .select("-password").sort({ createdAt: -1 });
    res.json({ success: true, students });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- TESTIMONIALS ----
router.get("/testimonials", async (req, res) => {
  try {
    const Testimonial = require("../models/Testimonial");
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.json({ success: true, testimonials });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.put("/testimonials/:id/approve", async (req, res) => {
  try {
    const Testimonial = require("../models/Testimonial");
    const t = await Testimonial.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
    res.json({ success: true, testimonial: t });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.delete("/testimonials/:id", async (req, res) => {
  try {
    const Testimonial = require("../models/Testimonial");
    await Testimonial.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- BLOCKED DATES ----
const BlockedDate = require("../models/BlockedDate");
router.get("/blocked-dates", async (req, res) => {
  try {
    const blocked = await BlockedDate.find().sort("date");
    res.json({ success: true, blockedDates: blocked });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.post("/blocked-dates", async (req, res) => {
  try {
    const { date, reason, timeSlot } = req.body;

    // ---- Single-slot block ("8:00 PM on 14 July only") ----
    if (timeSlot) {
      const dayBlock = await BlockedDate.findOne({ date, allDay: true });
      if (dayBlock) {
        return res.status(400).json({ success: false, error: "That whole day is already blocked" });
      }
      let partial = await BlockedDate.findOne({ date, allDay: false });
      if (partial) {
        if ((partial.blockedSlots || []).includes(timeSlot)) {
          return res.status(400).json({ success: false, error: "That slot is already blocked for this date" });
        }
        partial.blockedSlots.push(timeSlot);
        if (reason) partial.reason = reason;
        await partial.save();
        return res.status(201).json({ success: true, blocked: partial });
      }
      const blocked = await BlockedDate.create({
        date, reason: reason || "Unavailable", allDay: false, blockedSlots: [timeSlot],
      });
      return res.status(201).json({ success: true, blocked });
    }

    // ---- Whole-day block (existing behavior) ----
    const existing = await BlockedDate.findOne({ date, allDay: true });
    if (existing) return res.status(400).json({ success: false, error: "Date already blocked" });
    // A full-day block supersedes any single-slot blocks on the same date
    await BlockedDate.deleteMany({ date, allDay: false });
    const blocked = await BlockedDate.create({ date, reason: reason || "Unavailable", allDay: true });
    res.status(201).json({ success: true, blocked });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.post("/blocked-dates/range", async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const exists = await BlockedDate.findOne({ date: dateStr });
      if (!exists) dates.push({ date: dateStr, reason: reason || "Vacation", allDay: true });
    }
    await BlockedDate.insertMany(dates);
    res.json({ success: true, message: `Blocked ${dates.length} dates`, dates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// Optional ?slot=8:00 PM removes just that slot from a partial block
// (deleting the whole record when it was the last one). Without ?slot,
// the entire block is removed — same as before.
router.delete("/blocked-dates/:id", async (req, res) => {
  try {
    const { slot } = req.query;
    if (slot) {
      const doc = await BlockedDate.findById(req.params.id);
      if (doc && !doc.allDay) {
        doc.blockedSlots = (doc.blockedSlots || []).filter((t) => t !== slot);
        if (doc.blockedSlots.length === 0) await doc.deleteOne();
        else await doc.save();
        return res.json({ success: true });
      }
    }
    await BlockedDate.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Date unblocked" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- CLEAN DATABASE ----
router.delete("/clean-database", async (req, res) => {
  try {
    const { deleteStudents, deleteBookings, deletePayments } = req.body;
    const results = {};
    if (deleteBookings) results.bookings = (await Booking.deleteMany({})).deletedCount;
    if (deletePayments) results.payments = (await Payment.deleteMany({})).deletedCount;
    if (deleteStudents) {
      const User = require("../models/User");
      results.students = (await User.deleteMany({ role: "student" })).deletedCount;
    }
    res.json({ success: true, deleted: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
