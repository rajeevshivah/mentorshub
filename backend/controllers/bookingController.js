const Booking = require("../models/Booking");
const { sendBookingConfirmation } = require("../utils/sendEmail");

exports.createBooking = async (req, res) => {
  const { packageId, packageName, packagePrice, packageDuration,
          date, timeSlot, studentInfo, paymentId, meetLink } = req.body;

  // Check if slot is already taken
  const conflict = await Booking.findOne({
    date, timeSlot, status: { $in: ["confirmed", "pending"] },
  });
  if (conflict) {
    return res.status(409).json({ success: false, error: "Slot already booked. Please choose another." });
  }

  const booking = await Booking.create({
    user: req.user.id,
    packageId, packageName, packagePrice, packageDuration,
    date, timeSlot, studentInfo,
    payment: paymentId,
    meetLink,
    status: "confirmed",
  });

  // Send confirmation email
  await sendBookingConfirmation(studentInfo.email, booking);

  res.status(201).json({ success: true, booking });
};

exports.getMyBookings = async (req, res) => {
  const bookings = await Booking.find({ user: req.user.id })
    .sort({ createdAt: -1 });
  res.json({ success: true, bookings });
};

exports.cancelBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ success: false, error: "Booking not found" });
  if (booking.user.toString() !== req.user.id)
    return res.status(403).json({ success: false, error: "Not authorized" });
  booking.status = "cancelled";
  booking.cancelledAt = new Date();
  booking.cancelReason = req.body.reason || "Cancelled by student";
  await booking.save();
  res.json({ success: true, booking });
};