const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require("../models/Payment");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = async (req, res) => {
  const { amount, packageName } = req.body;
  const order = await razorpay.orders.create({
    amount: amount * 100,
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
    notes: { packageName, userId: req.user.id },
  });
  const payment = await Payment.create({
    user: req.user.id,
    razorpayOrderId: order.id,
    amount: amount * 100,
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
};

exports.verifyPayment = async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentDbId } = req.body;
  const body = razorpayOrderId + "|" + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body).digest("hex");
  if (expectedSignature !== razorpaySignature)
    return res.status(400).json({ success: false, error: "Payment verification failed" });
  await Payment.findByIdAndUpdate(paymentDbId, {
    razorpayPaymentId, razorpaySignature, status: "paid",
  });
  res.json({ success: true, message: "Payment verified" });
};