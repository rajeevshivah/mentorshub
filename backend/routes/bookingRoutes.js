const express = require("express");
const router = express.Router();
const {
  createBooking, getMyBookings, cancelBooking, confirmUpiBooking,
  rescheduleBooking, completeBooking, respondToReschedule,
} = require("../controllers/bookingController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.route("/").get(protect, getMyBookings).post(protect, createBooking);
router.put("/:id/cancel", protect, cancelBooking);
router.put("/:id/reschedule", protect, rescheduleBooking);        // owner (request) OR admin (immediate)
router.put("/:id/reschedule-respond", protect, adminOnly, respondToReschedule); // admin accept/reject
router.put("/:id/confirm-upi", protect, adminOnly, confirmUpiBooking);
router.put("/:id/complete", protect, adminOnly, completeBooking);

module.exports = router;
