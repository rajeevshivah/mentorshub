const mongoose = require("mongoose");

const testimonialSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true },
  college: { type: String },
  year: { type: String },
  rating: { type: Number, required: true, min: 1, max: 5 },
  text: { type: String, required: true, minlength: 20 },
  domain: { type: String, default: "Tech Mentorship" },
  // Admin approves before showing publicly
  approved: { type: Boolean, default: false },
  // Optional: student photo URL
  photoUrl: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("Testimonial", testimonialSchema);