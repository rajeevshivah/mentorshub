const express = require("express");
const router = express.Router();
const { createBooking, getMyBookings, cancelBooking, confirmUpiBooking } = require("../controllers/bookingController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.route("/").get(protect, getMyBookings).post(protect, createBooking);
router.put("/:id/cancel", protect, cancelBooking);
router.put("/:id/confirm-upi", protect, adminOnly, confirmUpiBooking);

module.exports = router;