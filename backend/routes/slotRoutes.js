const express = require("express");
const router = express.Router();
const Slot = require("../models/Slot");
const Booking = require("../models/Booking");
const BlockedDate = require("../models/BlockedDate");
const { tooSoon } = require("../utils/slotRules");
const { ACTIVE_BOOKING_STATUSES } = require("../utils/bookingConstants");

// All active slots
router.get("/", async (req, res) => {
  try {
    const slots = await Slot.find({ isActive: true }).sort("time");
    res.json({ success: true, slots });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Available slots for a date
router.get("/available", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, error: "Date required" });

    const blocked = await BlockedDate.findOne({ date, allDay: true });
    if (blocked) {
      return res.json({ success: true, slots: [], message: `Not available: ${blocked.reason}` });
    }

    const allSlots = await Slot.find({ isActive: true }).sort("time");

    // FIX: use the SAME status set as the conflict check, so a slot held by a
    // pending_upi booking is correctly shown as unavailable.
    const bookedSlots = await Booking.find({
      date,
      status: { $in: ACTIVE_BOOKING_STATUSES },
    }).select("timeSlot");
    const bookedTimes = bookedSlots.map((b) => b.timeSlot);

    const partialBlock = await BlockedDate.findOne({ date, allDay: false });
    const partialBlockedSlots = partialBlock?.blockedSlots || [];

    const available = allSlots.filter(
      (s) =>
        !bookedTimes.includes(s.time) &&
        !partialBlockedSlots.includes(s.time) &&
        // same-day: hide slots that already passed or start within 2 hours (IST)
        !tooSoon(date, s.time)
    );

    res.json({ success: true, slots: available });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
