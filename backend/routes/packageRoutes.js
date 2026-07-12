const express = require("express");
const router = express.Router();
const Package = require("../models/Package");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// ============================================================
// PUBLIC
// ============================================================

// Get active packages (optionally filtered by brand).
// Frontends call: GET /api/packages?brand=tech  (or ?brand=meditation)
router.get("/", async (req, res) => {
  try {
    const filter = { active: true };
    if (req.query.brand) filter.brand = req.query.brand;
    const packages = await Package.find(filter).sort({ sortOrder: 1, createdAt: 1 });
    res.json({ success: true, packages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// ADMIN  (everything below requires login + admin role)
// ============================================================
router.use(protect, adminOnly);

// Get ALL packages incl. inactive (admin view). Optional ?brand=
router.get("/admin/all", async (req, res) => {
  try {
    const filter = {};
    if (req.query.brand) filter.brand = req.query.brand;
    const packages = await Package.find(filter).sort({ brand: 1, sortOrder: 1 });
    res.json({ success: true, packages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create
router.post("/", async (req, res) => {
  try {
    const { name, duration, price } = req.body;
    if (!name || !duration || price === undefined) {
      return res.status(400).json({
        success: false,
        error: "name, duration and price are required",
      });
    }
    const pkg = await Package.create(req.body);
    res.status(201).json({ success: true, package: pkg });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update (edit fields, toggle active/popular, change sortOrder, etc.)
router.put("/:id", async (req, res) => {
  try {
    const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!pkg) return res.status(404).json({ success: false, error: "Package not found" });
    res.json({ success: true, package: pkg });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete
router.delete("/:id", async (req, res) => {
  try {
    await Package.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Package deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
