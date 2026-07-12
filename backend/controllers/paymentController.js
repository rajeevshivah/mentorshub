const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require("../models/Payment");
const Package = require("../models/Package");
const { toPaise } = require("../utils/bookingConstants");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ============================================================
// CREATE ORDER — amount derived from the DB package, NOT the client.
// Client sends packageId; server looks up the real price.
// ============================================================
exports.createOrder = async (req, res) => {
  try {
    const { packageId } = req.body;
    if (!packageId) {
      return res.status(400).json({ success: false, error: "packageId required" });
    }

    const pkg = await Package.findById(packageId);
    if (!pkg || !pkg.active) {
      return res.status(400).json({ success: false, error: "Invalid or inactive package" });
    }

    const amountPaise = toPaise(pkg.price);
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: { packageName: pkg.name, userId: req.user.id },
    });

    const payment = await Payment.create({
      user: req.user.id,
      razorpayOrderId: order.id,
      amount: amountPaise,
      status: "created",
    });

    res.json({
      success: true,
      orderId: order.id,
      paymentId: payment._id,
      key: process.env.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err) {
    console.error("Create order error:", err.message);
    res.status(500).json({ success: false, error: "Could not create payment order" });
  }
};

// ============================================================
// VERIFY PAYMENT — HMAC signature check (unchanged logic, now guarded)
// ============================================================
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentDbId } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !paymentDbId) {
      return res.status(400).json({ success: false, error: "Missing verification fields" });
    }

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpayOrderId + "|" + razorpayPaymentId)
      .digest("hex");

    if (expected !== razorpaySignature) {
      return res.status(400).json({ success: false, error: "Payment verification failed" });
    }

    // Confirm the payment row belongs to this user before marking paid
    const payment = await Payment.findById(paymentDbId);
    if (!payment || payment.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: "Payment not found for this user" });
    }

    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.status = "paid";
    await payment.save();

    res.json({ success: true, message: "Payment verified" });
  } catch (err) {
    console.error("Verify payment error:", err.message);
    res.status(500).json({ success: false, error: "Payment verification error" });
  }
};

// ============================================================
// ADMIN: Record a refund (Layer 3)
// Tries the Razorpay refund API if a razorpayPaymentId exists;
// always records the refund in our DB.
// ============================================================
exports.refundPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, error: "Payment not found" });
    if (payment.status === "refunded") {
      return res.status(400).json({ success: false, error: "Already refunded" });
    }
    if (payment.status !== "paid") {
      return res.status(400).json({ success: false, error: "Only paid payments can be refunded" });
    }

    let refundId = req.body.refundId || null;

    // Attempt a real Razorpay refund (skip for UPI/manual which have no razorpayPaymentId)
    if (payment.razorpayPaymentId) {
      try {
        const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
          amount: payment.amount, // full refund
        });
        refundId = refund.id;
      } catch (rzErr) {
        // Don't block recording the refund if the gateway call fails;
        // surface it but let admin mark it manually.
        console.error("Razorpay refund error:", rzErr.message);
        if (!req.body.forceManual) {
          return res.status(502).json({
            success: false,
            error: "Razorpay refund failed: " + rzErr.message + ". Retry with manual flag to record anyway.",
          });
        }
      }
    }

    payment.status = "refunded";
    payment.refundId = refundId;
    payment.refundedAt = new Date();
    await payment.save();

    res.json({ success: true, payment });
  } catch (err) {
    console.error("Refund error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};
