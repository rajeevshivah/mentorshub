const Booking = require("../models/Booking");
const { sendBookingConfirmation, sendUpiPendingEmail, sendUpiConfirmedEmail } = require("../utils/sendEmail");

// ---- Create booking (Razorpay or UPI) ----
exports.createBooking = async (req, res) => {
  try {
    const { packageId, packageName, packagePrice, packageDuration,
            date, timeSlot, studentInfo, paymentId, meetLink,
            paymentMethod, upiTransactionId } = req.body;

    // Check if slot is already taken
    const conflict = await Booking.findOne({
      date,
      timeSlot,
      status: { $in: ["confirmed", "pending_upi"] },
    });
    if (conflict) {
      return res.status(409).json({
        success: false,
        error: "This slot is already booked. Please choose another time.",
      });
    }

    // UPI bookings start as pending_upi, Razorpay as confirmed
    const status = paymentMethod === "upi" ? "pending_upi" : "confirmed";

    const booking = await Booking.create({
      user: req.user.id,
      packageId, packageName, packagePrice, packageDuration,
      date, timeSlot, studentInfo,
      payment: paymentId || null,
      meetLink: meetLink || null,
      status,
      paymentMethod: paymentMethod || "razorpay",
      upiTransactionId: upiTransactionId || null,
    });

    // Send appropriate email
    if (status === "confirmed") {
      await sendBookingConfirmation(studentInfo.email, booking);
    } else {
      await sendUpiPendingEmail(studentInfo.email, booking);
    }

    res.status(201).json({ success: true, booking });
  } catch (err) {
    console.error("❌ Create booking error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ---- Get current user's bookings ----
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ---- Cancel booking ----
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: "Booking not found" });
    if (booking.user.toString() !== req.user.id)
      return res.status(403).json({ success: false, error: "Not authorized" });
    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    booking.cancelReason = req.body.reason || "Cancelled by student";
    await booking.save();
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ---- Admin: Confirm UPI payment ----
// exports.confirmUpiBooking = async (req, res) => {
//   try {
//     const booking = await Booking.findById(req.params.id);
//     if (!booking) return res.status(404).json({ success: false, error: "Booking not found" });
//     if (booking.status !== "pending_upi") {
//       return res.status(400).json({ success: false, error: "Booking is not pending UPI confirmation" });
//     }
//     booking.status = "confirmed";
//     booking.meetLink = req.body.meetLink || "https://meet.google.com/mentorshub-session";
//     await booking.save();

//     // Send confirmation email to student
//     await sendUpiConfirmedEmail(booking.studentInfo.email, booking);

//     res.json({ success: true, booking });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };
exports.confirmUpiBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: "Booking not found" });
    }
    if (booking.status !== "pending_upi") {
      return res.status(400).json({ success: false, error: "Booking is not pending UPI" });
    }

    booking.status = "confirmed";
    booking.meetLink = req.body.meetLink || "https://meet.google.com/mentorshub-session";
    await booking.save();

    // Send confirmation email
    try {
      await sendUpiConfirmedEmail(booking.studentInfo.email, booking);
      console.log("✅ UPI confirmation email sent to:", booking.studentInfo.email);
    } catch (emailErr) {
      console.error("❌ Email error:", emailErr.message);
      // Don't fail the request if email fails
    }

    res.json({ success: true, booking });
  } catch (err) {
    console.error("❌ Confirm UPI error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};