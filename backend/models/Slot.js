const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema({
  time: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  daysAvailable: {
    type: [String],
    default: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
  },
  blockedDates: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model("Slot", slotSchema);