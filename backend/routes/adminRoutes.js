const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Slot = require("../models/Slot");

// All routes below require login + admin role
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

// ---- ALL BOOKINGS ----
router.get("/bookings", async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user", "name email phone")
      .populate("payment", "status razorpayPaymentId method amount")
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- UPDATE BOOKING STATUS ----
router.put("/bookings/:id", async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
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
      req.params.id,
      { adminNotes: note },
      { new: true }
    );
    res.json({ success: true, booking });
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

// ---- GET ALL SLOTS ----
router.get("/slots", async (req, res) => {
  try {
    const slots = await Slot.find().sort("time");
    res.json({ success: true, slots });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- ADD SLOT ----
router.post("/slots", async (req, res) => {
  try {
    const { time } = req.body;
    const existing = await Slot.findOne({ time });
    if (existing) {
      return res.status(400).json({ success: false, error: "Slot already exists" });
    }
    const slot = await Slot.create({ time });
    res.status(201).json({ success: true, slot });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- TOGGLE SLOT ACTIVE/INACTIVE ----
router.put("/slots/:id", async (req, res) => {
  try {
    const slot = await Slot.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json({ success: true, slot });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- DELETE SLOT ----
router.delete("/slots/:id", async (req, res) => {
  try {
    await Slot.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Slot removed" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- ALL STUDENTS ----
router.get("/students", async (req, res) => {
  try {
    const User = require("../models/User");
    const students = await User.find({ role: "student" })
      .select("-password")
      .sort({ createdAt: -1 });
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
    const t = await Testimonial.findByIdAndUpdate(
      req.params.id,
      { approved: true },
      { new: true }
    );
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

const BlockedDate = require("../models/BlockedDate");

// ---- GET all blocked dates ----
router.get("/blocked-dates", async (req, res) => {
  try {
    const blocked = await BlockedDate.find().sort("date");
    res.json({ success: true, blockedDates: blocked });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- BLOCK a single date (all slots) ----
router.post("/blocked-dates", async (req, res) => {
  try {
    const { date, reason } = req.body;
    const existing = await BlockedDate.findOne({ date });
    if (existing) {
      return res.status(400).json({ success: false, error: "Date already blocked" });
    }
    const blocked = await BlockedDate.create({ date, reason: reason || "Unavailable", allDay: true });
    res.status(201).json({ success: true, blocked });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- BLOCK date range (vacation mode) ----
router.post("/blocked-dates/range", async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const exists = await BlockedDate.findOne({ date: dateStr });
      if (!exists) {
        dates.push({ date: dateStr, reason: reason || "Vacation", allDay: true });
      }
    }

    await BlockedDate.insertMany(dates);
    res.json({ success: true, message: `Blocked ${dates.length} dates`, dates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- UNBLOCK a date ----
router.delete("/blocked-dates/:id", async (req, res) => {
  try {
    await BlockedDate.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Date unblocked" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- CLEAN DATABASE (delete test data) ----
router.delete("/clean-database", async (req, res) => {
  try {
    const { deleteStudents, deleteBookings, deletePayments } = req.body;
    const results = {};
    if (deleteBookings) {
      const b = await Booking.deleteMany({});
      results.bookings = b.deletedCount;
    }
    if (deletePayments) {
      const Payment = require("../models/Payment");
      const p = await Payment.deleteMany({});
      results.payments = p.deletedCount;
    }
    if (deleteStudents) {
      const User = require("../models/User");
      const u = await User.deleteMany({ role: "student" });
      results.students = u.deletedCount;
    }
    res.json({ success: true, deleted: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
module.exports = router;