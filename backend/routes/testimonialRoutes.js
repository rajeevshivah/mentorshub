const express = require("express");
const router = express.Router();
const Testimonial = require("../models/Testimonial");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// ---- Public: Submit a testimonial ----
router.post("/", async (req, res) => {
  try {
    const { name, email, college, year, rating, text, domain, brand } = req.body;
    if (!name || !email || !rating || !text) {
      return res.status(400).json({ success: false, error: "Please fill all required fields" });
    }
    const testimonial = await Testimonial.create({
      name, email, college, year, rating, text, domain,
      brand: ["tech", "meditation"].includes(brand) ? brand : "tech",
      approved: false, // needs admin approval
    });
    res.status(201).json({
      success: true,
      message: "Thank you! Your testimonial will appear after review.",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- Public: Get approved testimonials ----
router.get("/", async (req, res) => {
  try {
    // ?brand=meditation → only meditation reviews.
    // ?brand=tech (or none) → tech reviews INCLUDING old ones without the field.
    const filter = { approved: true };
    if (req.query.brand === "meditation") filter.brand = "meditation";
    else if (req.query.brand === "tech") filter.brand = { $ne: "meditation" };
    const testimonials = await Testimonial.find(filter)
      .sort({ createdAt: -1 })
      .select("-email");
    res.json({ success: true, testimonials });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- Admin: Get all testimonials (including pending) ----
router.get("/admin/all", protect, adminOnly, async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.json({ success: true, testimonials });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- Admin: Approve testimonial ----
router.put("/:id/approve", protect, adminOnly, async (req, res) => {
  try {
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

// ---- Admin: Delete testimonial ----
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    await Testimonial.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;