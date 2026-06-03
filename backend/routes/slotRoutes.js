const express = require("express");
const router = express.Router();
const Slot = require("../models/Slot");
const Booking = require("../models/Booking");

router.get("/", async (req, res) => {
  const slots = await Slot.find({ isActive: true }).sort("time");
  res.json({ success: true, slots });
});

router.get("/available", async (req, res) => {
  const { date } = req.query;
  const booked = await Booking.find({ date, status: { $in: ["confirmed","pending"] } }).select("timeSlot");
  const bookedTimes = booked.map(b => b.timeSlot);
  const allSlots = await Slot.find({ isActive: true });
  const available = allSlots.filter(s => !bookedTimes.includes(s.time));
  res.json({ success: true, slots: available });
});

module.exports = router;