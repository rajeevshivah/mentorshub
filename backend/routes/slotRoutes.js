const express = require("express");
const router = express.Router();
const Slot = require("../models/Slot");
const Booking = require("../models/Booking");
const BlockedDate = require("../models/BlockedDate");

// Get all active slots
router.get("/", async (req, res) => {
  try {
    const slots = await Slot.find({ isActive: true }).sort("time");
    res.json({ success: true, slots });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get available slots for a specific date
router.get("/available", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, error: "Date required" });

    // Check if entire date is blocked
    const blocked = await BlockedDate.findOne({ date, allDay: true });
    if (blocked) {
      return res.json({
        success: true,
        slots: [],
        message: `Not available on this date: ${blocked.reason}`
      });
    }

    // Get all active slots
    const allSlots = await Slot.find({ isActive: true }).sort("time");

    // Get already booked slots for this date
    const bookedSlots = await Booking.find({
      date,
      status: { $in: ["confirmed", "pending"] }
    }).select("timeSlot");
    const bookedTimes = bookedSlots.map(b => b.timeSlot);

    // Get specifically blocked slots for this date
    const partialBlock = await BlockedDate.findOne({ date, allDay: false });
    const partialBlockedSlots = partialBlock?.blockedSlots || [];

    // Filter out booked and blocked slots
    const available = allSlots.filter(s =>
      !bookedTimes.includes(s.time) &&
      !partialBlockedSlots.includes(s.time)
    );

    res.json({ success: true, slots: available });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;