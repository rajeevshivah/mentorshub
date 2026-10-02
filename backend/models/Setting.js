const mongoose = require("mongoose");

// Generic key/value store for site-wide settings editable from the admin panel.
// Current keys:
//   "upiQr:tech"        → MentorHub UPI QR      { dataUrl }
//   "upiQr:meditation"  → talkWithShivah UPI QR { dataUrl }
const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

module.exports = mongoose.model("Setting", settingSchema);
