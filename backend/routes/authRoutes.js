const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const {
  register, login, getMe, updateProfile, forgotPassword, resetPassword, googleAuth,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Tighter limiter for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: "Too many attempts. Please try again later." },
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/google", authLimiter, googleAuth);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);

module.exports = router;
