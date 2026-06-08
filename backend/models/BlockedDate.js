const mongoose = require("mongoose");

const blockedDateSchema = new mongoose.Schema({
  date: { type: String, required: true }, // "2026-06-10"
  reason: { type: String, default: "Unavailable" },
  allDay: { type: Boolean, default: true },
  blockedSlots: [{ type: String }], // specific slots if not all day
}, { timestamps: true });

module.exports = mongoose.model("BlockedDate", blockedDateSchema);