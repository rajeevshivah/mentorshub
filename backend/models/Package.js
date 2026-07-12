const mongoose = require("mongoose");

// ============================================================
// Package model
// Replaces the hardcoded PACKAGES array in constants.js
// `brand` lets the SAME backend serve both themed frontends
// (tech mentorship + meditation/spirituality)
// ============================================================
const packageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  duration: { type: String, required: true },          // e.g. "30 min"
  price: { type: Number, required: true, min: 0 },
  icon: { type: String, default: "⭐" },               // emoji or short text
  desc: { type: String, default: "" },
  features: { type: [String], default: [] },
  popular: { type: Boolean, default: false },
  active: { type: Boolean, default: true },             // hide without deleting
  brand: {
    type: String,
    enum: ["tech", "meditation"],
    default: "tech",
    index: true,
  },
  sortOrder: { type: Number, default: 0 },              // controls display order
}, { timestamps: true });

module.exports = mongoose.model("Package", packageSchema);
