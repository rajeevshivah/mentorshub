const express = require("express");
const router = express.Router();
const { createBooking, getMyBookings, cancelBooking } = require("../controllers/bookingController");
const { protect } = require("../middleware/authMiddleware");

router.route("/").get(protect, getMyBookings).post(protect, createBooking);
router.put("/:id/cancel", protect, cancelBooking);

module.exports = router;