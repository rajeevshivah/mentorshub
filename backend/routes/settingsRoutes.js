const express = require("express");
const router = express.Router();
const Setting = require("../models/Setting");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const BRANDS = ["tech", "meditation"];
const MAX_QR_BYTES = 1.5 * 1024 * 1024; // decoded image size cap (~1.5 MB)
const DATA_URL_RX = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/;

const qrKey = (brand) => `upiQr:${brand}`;
const pickBrand = (b) => (BRANDS.includes(b) ? b : "tech");

// ============================================================
// PUBLIC
// ============================================================

// GET /api/settings/upi-qr?brand=tech
// Returns the uploaded QR as a data URL, or qr: null when none is set
// (the frontend then falls back to its built-in default QR).
router.get("/upi-qr", async (req, res) => {
  try {
    const brand = pickBrand(req.query.brand);
    const doc = await Setting.findOne({ key: qrKey(brand) });
    res.json({
      success: true,
      brand,
      qr: doc?.value?.dataUrl || null,
      updatedAt: doc?.updatedAt || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// ADMIN
// ============================================================
router.use(protect, adminOnly);

// PUT /api/settings/upi-qr   body: { brand, dataUrl }
router.put("/upi-qr", async (req, res) => {
  try {
    const brand = pickBrand(req.body.brand);
    const { dataUrl } = req.body;
    const m = DATA_URL_RX.exec(dataUrl || "");
    if (!m) {
      return res.status(400).json({ success: false, error: "Upload a PNG, JPG or WEBP image" });
    }
    const bytes = Buffer.from(m[2], "base64").length;
    if (bytes > MAX_QR_BYTES) {
      return res.status(400).json({ success: false, error: "Image too large (max 1.5 MB)" });
    }
    const doc = await Setting.findOneAndUpdate(
      { key: qrKey(brand) },
      { value: { dataUrl } },
      { new: true, upsert: true }
    );
    res.json({ success: true, brand, qr: doc.value.dataUrl, updatedAt: doc.updatedAt });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/settings/upi-qr?brand=tech  → back to the built-in default QR
router.delete("/upi-qr", async (req, res) => {
  try {
    const brand = pickBrand(req.query.brand);
    await Setting.deleteOne({ key: qrKey(brand) });
    res.json({ success: true, brand, qr: null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
