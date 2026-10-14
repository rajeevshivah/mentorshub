// ============================================================
// Razorpay — online payments for MentorHub + talkWithShivah bookings.
// Talks to the Razorpay REST API directly (native fetch + crypto,
// no npm package). Mounted at /api/rzp.
//
// Env (Render):
//   RAZORPAY_KEY_ID          rzp_live_...
//   RAZORPAY_KEY_SECRET      secret from the Razorpay dashboard
//   RAZORPAY_WEBHOOK_SECRET  any long random string, also typed into the webhook setup
//
// If KEY_ID / KEY_SECRET are missing, /config says enabled:false and the
// frontends show manual UPI only, exactly as before.
//
// The Razorpay account is SHARED with learn.rajeevshivah.me, so this
// webhook also receives learn-portal payments. Any order that has no
// OnlinePayment here is ignored with a 200.
// ============================================================
const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const OnlinePayment = require("../models/OnlinePayment");
const Booking = require("../models/Booking");
const Package = require("../models/Package");
const brandMeta = require("../utils/brandMeta");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { toPaise } = require("../utils/bookingConstants");
const { slotUnavailableReason } = require("../utils/slotRules");
const { HOLD_MINUTES, slotTaken, bookingOnSlot } = require("../utils/slotHold");
const {
  sendPaymentReceivedEmail, sendAdminNewBookingEmail, sendSlotConflictEmails,
} = require("../utils/sendEmail");

const KEY_ID = () => (process.env.RAZORPAY_KEY_ID || "").trim();
const KEY_SECRET = () => (process.env.RAZORPAY_KEY_SECRET || "").trim();
const isEnabled = () => Boolean(KEY_ID() && KEY_SECRET());

const RZP_API = "https://api.razorpay.com/v1";
const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;

// Checkout colours per brand
const CHECKOUT_THEME = { tech: "#f0a500", meditation: "#9a82f2" };

async function rzp(method, path, body) {
  const auth = Buffer.from(`${KEY_ID()}:${KEY_SECRET()}`).toString("base64");
  const res = await fetch(`${RZP_API}${path}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.description || `Razorpay error (${res.status})`);
    err.statusCode = 502;
    throw err;
  }
  return data;
}

const safeEqual = (a, b) => {
  const A = Buffer.from(String(a || ""));
  const B = Buffer.from(String(b || ""));
  return A.length === B.length && crypto.timingSafeEqual(A, B);
};

const clean = (v, max = 500) => String(v ?? "").trim().slice(0, max);

// Forward async errors to the global error handler (Express 4 doesn't)
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ============================================================
// Capture if the account isn't on auto-capture. An "authorized"
// payment is auto-refunded by Razorpay after a few days otherwise.
// ============================================================
async function ensureCaptured(rzpPayment) {
  if (rzpPayment.status === "authorized") {
    try {
      return await rzp("POST", `/payments/${rzpPayment.id}/capture`, {
        amount: rzpPayment.amount,
        currency: rzpPayment.currency,
      });
    } catch (e) {
      // verify + webhook can race to capture; the loser gets "already captured"
      const fresh = await rzp("GET", `/payments/${rzpPayment.id}`);
      if (fresh.status === "captured") return fresh;
      throw e;
    }
  }
  return rzpPayment;
}

// ============================================================
// FULFIL — turn a paid order into a confirmed booking.
// Idempotent: verify and webhook can both arrive, even at the same
// moment. An atomic lock on the OnlinePayment lets exactly one caller
// create the booking; the others wait for its result. (The unique
// Booking.onlinePayment index is a second safety net.)
// Returns { payment, booking, conflict, pending }.
// ============================================================
const LOCK_MS = 60 * 1000;          // a crashed fulfil frees the lock after this
const AFTER = { returnDocument: "after" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function currentResult(paymentId) {
  const payment = await OnlinePayment.findById(paymentId);
  if (payment.conflict) return { payment, booking: null, conflict: true };
  const booking = await Booking.findOne({ onlinePayment: paymentId });
  if (booking) {
    if (!payment.bookingRef) {
      await OnlinePayment.updateOne({ _id: paymentId }, { bookingRef: booking._id, holdUntil: null });
    }
    return { payment, booking, conflict: false };
  }
  return null;
}

async function fulfil(paymentDoc, rzpPayment) {
  // 1. Sanity: the money matches what this order was for
  if (rzpPayment.order_id !== paymentDoc.orderId) {
    throw Object.assign(new Error("Payment does not belong to this order"), { statusCode: 400 });
  }
  if (Number(rzpPayment.amount) !== paymentDoc.amountPaise || rzpPayment.currency !== paymentDoc.currency) {
    throw Object.assign(new Error("Payment amount mismatch"), { statusCode: 400 });
  }
  if (rzpPayment.status !== "captured") {
    throw Object.assign(new Error(`Payment not captured (${rzpPayment.status})`), { statusCode: 400 });
  }

  // 2. Mark paid (safe to repeat; paidAt set once)
  await OnlinePayment.updateOne(
    { _id: paymentDoc._id },
    {
      $set: {
        status: "paid",
        paymentId: rzpPayment.id,
        method: rzpPayment.method || "",
        international: Boolean(rzpPayment.international),
        failReason: "",
      },
    }
  );
  await OnlinePayment.updateOne({ _id: paymentDoc._id, paidAt: null }, { $set: { paidAt: new Date() } });

  // 3. Already done?
  const done = await currentResult(paymentDoc._id);
  if (done) return done;

  // 4. Take the lock. If someone else holds it, wait for their result.
  const now = new Date();
  let payment = await OnlinePayment.findOneAndUpdate(
    {
      _id: paymentDoc._id, bookingRef: null, conflict: false,
      $or: [{ lockedAt: null }, { lockedAt: { $lt: new Date(now.getTime() - LOCK_MS) } }],
    },
    { $set: { lockedAt: now } },
    AFTER
  );
  if (!payment) {
    for (let i = 0; i < 16; i++) {
      await sleep(250);
      const r = await currentResult(paymentDoc._id);
      if (r) return r;
    }
    // Still being processed elsewhere — it will finish; report as pending
    return { payment: await OnlinePayment.findById(paymentDoc._id), booking: null, conflict: false, pending: true };
  }

  try {
    // 5. Is the slot still ours? (Our own hold doesn't count against us.)
    const { date, timeSlot, timezone, studentInfo } = payment.booking;
    const taken = await bookingOnSlot(date, timeSlot, { excludeOnlinePaymentId: payment._id });
    if (taken) {
      payment = await OnlinePayment.findByIdAndUpdate(
        payment._id,
        { $set: { conflict: true, conflictReason: "Slot was booked by someone else before payment completed", holdUntil: null, lockedAt: null } },
        AFTER
      );
      sendSlotConflictEmails(payment).catch(() => {});
      return { payment, booking: null, conflict: true };
    }

    // 6. Create the booking
    let booking;
    try {
      booking = await Booking.create({
        user: payment.user,
        packageId: String(payment.package),
        packageName: payment.packageName,
        packagePrice: payment.amount,
        packageDuration: payment.packageDuration || "—",
        brand: payment.brand,
        date, timeSlot,
        timezone: timezone || "Asia/Kolkata",
        studentInfo,
        status: "confirmed",
        paymentMethod: "razorpay",
        onlinePayment: payment._id,
        meetLink: null,              // admin sends it from the dashboard
      });
    } catch (e) {
      if (e.code !== 11000) throw e;
      return await currentResult(payment._id);   // created a moment ago elsewhere
    }

    payment = await OnlinePayment.findByIdAndUpdate(
      payment._id, { $set: { bookingRef: booking._id, holdUntil: null, lockedAt: null } }, AFTER
    );

    // Emails (only the caller that created the booking sends them)
    if (booking.studentInfo?.email) {
      sendPaymentReceivedEmail(booking.studentInfo.email, booking, payment).catch(() => {});
    }
    if (process.env.ADMIN_EMAIL) {
      sendAdminNewBookingEmail(process.env.ADMIN_EMAIL, booking).catch(() => {});
    }
    return { payment, booking, conflict: false };
  } catch (e) {
    await OnlinePayment.updateOne({ _id: paymentDoc._id }, { $set: { lockedAt: null } }).catch(() => {});
    throw e;
  }
}

const replyFor = ({ booking, conflict, payment, pending }) => (pending
  ? { success: true, pending: true, message: "Payment received. Your booking is being confirmed. Check your dashboard in a minute." }
  : conflict
  ? {
      success: true, conflict: true,
      message: "Payment received, but that slot was just taken. We'll contact you to pick a new time or refund in full.",
      paymentId: payment?.paymentId,
    }
  : { success: true, conflict: false, booking });

// ============================================================
// GET /api/rzp/config — public: is online payment switched on?
// ============================================================
router.get("/config", (req, res) => {
  res.json({ success: true, enabled: isEnabled(), keyId: isEnabled() ? KEY_ID() : "" });
});

// ============================================================
// POST /api/rzp/order — create a Razorpay order + hold the slot.
// Body: { packageId, date, timeSlot, studentInfo }
// The amount ALWAYS comes from the database.
// ============================================================
router.post("/order", protect, wrap(async (req, res) => {
  if (!isEnabled()) {
    return res.status(503).json({ success: false, error: "Online payment is not available right now. Please pay via UPI." });
  }

  const { packageId, date, timeSlot } = req.body;
  const si = req.body.studentInfo || {};
  if (!packageId || !date || !timeSlot || !DATE_RX.test(String(date))) {
    return res.status(400).json({ success: false, error: "Missing or invalid booking details" });
  }

  const studentInfo = {
    name: clean(si.name, 100), email: clean(si.email, 200).toLowerCase(), phone: clean(si.phone, 30),
    college: clean(si.college, 200), year: clean(si.year, 50), skills: clean(si.skills, 500),
    goals: clean(si.goals, 2000), questions: clean(si.questions, 2000),
  };
  if (!studentInfo.name || !studentInfo.email) {
    return res.status(400).json({ success: false, error: "Name and email are required" });
  }

  let pkg;
  try { pkg = await Package.findById(packageId); } catch { pkg = null; }
  if (!pkg || !pkg.active) {
    return res.status(400).json({ success: false, error: "Invalid or inactive package" });
  }
  if (!(pkg.price > 0)) {
    return res.status(400).json({ success: false, error: "This package can't be paid online" });
  }

  // Release this user's own earlier holds (they changed slot / reopened checkout)
  await OnlinePayment.updateMany(
    { user: req.user._id, status: { $in: ["created", "failed"] }, holdUntil: { $gt: new Date() } },
    { $set: { holdUntil: new Date() } }
  );

  if (await slotTaken(date, timeSlot, { excludeUserId: req.user._id })) {
    return res.status(409).json({ success: false, error: "This slot was just booked. Please choose another time." });
  }
  const unavailable = await slotUnavailableReason(date, timeSlot);
  if (unavailable) return res.status(409).json({ success: false, error: unavailable });

  const amountPaise = toPaise(pkg.price);
  let order;
  try {
    order = await rzp("POST", "/orders", {
      amount: amountPaise,
      currency: "INR",
      receipt: `mh_${String(pkg._id).slice(-6)}_${Date.now().toString(36)}`.slice(0, 40),
      notes: {
        app: "mentorhub",
        brand: pkg.brand,
        package: pkg.name.slice(0, 200),
        slot: `${date} ${timeSlot}`,
        userId: String(req.user._id),
        email: studentInfo.email,
      },
    });
  } catch (e) {
    console.error("Razorpay order error:", e.message);
    return res.status(502).json({ success: false, error: "Could not start payment. Please try again or pay via UPI." });
  }

  await OnlinePayment.create({
    user: req.user._id,
    brand: pkg.brand,
    package: pkg._id,
    packageName: pkg.name,
    packageDuration: pkg.duration,
    amount: pkg.price,
    amountPaise,
    currency: "INR",
    orderId: order.id,
    booking: { date, timeSlot, timezone: "Asia/Kolkata", studentInfo },
    holdUntil: new Date(Date.now() + HOLD_MINUTES * 60 * 1000),
  });

  const bm = brandMeta(pkg.brand);
  res.status(201).json({
    success: true,
    keyId: KEY_ID(),
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    name: bm.name,
    description: `${pkg.name} · ${date} ${timeSlot}`.slice(0, 250),
    themeColor: CHECKOUT_THEME[pkg.brand] || CHECKOUT_THEME.tech,
    holdMinutes: HOLD_MINUTES,
    prefill: { name: studentInfo.name, email: studentInfo.email, contact: studentInfo.phone },
  });
}));

// ============================================================
// POST /api/rzp/verify — browser calls this right after checkout succeeds.
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// ============================================================
router.post("/verify", protect, wrap(async (req, res) => {
  if (!isEnabled()) return res.status(503).json({ success: false, error: "Online payment is not configured" });

  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = req.body;
  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({ success: false, error: "Incomplete payment response" });
  }

  const expected = crypto.createHmac("sha256", KEY_SECRET())
    .update(`${orderId}|${paymentId}`).digest("hex");
  if (!safeEqual(expected, signature)) {
    return res.status(400).json({ success: false, error: "Payment signature mismatch. If money was deducted, email rajeev@rajeevshivah.me" });
  }

  const payment = await OnlinePayment.findOne({ orderId });
  if (!payment || String(payment.user) !== String(req.user._id)) {
    return res.status(404).json({ success: false, error: "Payment record not found" });
  }

  try {
    let rzpPayment = await rzp("GET", `/payments/${paymentId}`);
    if (rzpPayment.order_id !== orderId) {
      return res.status(400).json({ success: false, error: "Payment does not belong to this order" });
    }
    rzpPayment = await ensureCaptured(rzpPayment);
    const result = await fulfil(payment, rzpPayment);
    res.json(replyFor(result));
  } catch (e) {
    console.error("Razorpay verify error:", e.message);
    res.status(e.statusCode || 500).json({
      success: false,
      error: "We couldn't confirm your payment yet. If money was deducted, your booking will confirm automatically within a few minutes. Check your dashboard.",
    });
  }
}));

// ============================================================
// POST /api/rzp/webhook — Razorpay server → our server.
// Safety net if the student closes the tab before /verify runs.
// server.js gives this route the RAW body (signature is on the raw bytes).
// ============================================================
router.post("/webhook", wrap(async (req, res) => {
  const secret = (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();
  if (!secret || !isEnabled()) {
    // Not configured on this service — acknowledge so Razorpay doesn't keep retrying
    return res.status(200).json({ ok: true, ignored: "not configured" });
  }

  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  if (!safeEqual(expected, req.headers["x-razorpay-signature"])) {
    return res.status(400).json({ ok: false, error: "Invalid signature" });
  }

  let evt;
  try { evt = JSON.parse(raw.toString("utf8")); } catch { return res.status(400).json({ ok: false }); }

  const pay = evt?.payload?.payment?.entity;
  const orderId = evt?.payload?.order?.entity?.id || pay?.order_id;
  if (!orderId) return res.json({ ok: true, ignored: "no order" });

  const payment = await OnlinePayment.findOne({ orderId });
  if (!payment) return res.json({ ok: true, ignored: "not a MentorHub order" });   // e.g. learn portal

  try {
    if (evt.event === "payment.failed") {
      // Never downgrade a paid order. Keep the hold: the student can retry
      // inside the same checkout window, and the hold expires on its own.
      await OnlinePayment.updateOne(
        { _id: payment._id, status: { $in: ["created", "failed"] } },
        { $set: { status: "failed", failReason: clean(pay?.error_description, 300) } }
      );
    } else if (["payment.authorized", "payment.captured", "order.paid"].includes(evt.event) && pay) {
      // Re-fetch rather than trusting the event snapshot (status may have moved on)
      let fresh = await rzp("GET", `/payments/${pay.id}`);
      fresh = await ensureCaptured(fresh);
      const result = await fulfil(payment, fresh);
      // Another request is mid-way through this order; ask Razorpay to retry
      // later so a crash there can't leave the payment without a booking.
      if (result?.pending) return res.status(500).json({ ok: false, error: "In progress, retry later" });
    }
  } catch (e) {
    console.error("Razorpay webhook error:", e.message);
    if (e.statusCode === 400) return res.json({ ok: true, ignored: e.message });  // permanent, don't retry
    return res.status(500).json({ ok: false, error: "Retry later" });             // Razorpay retries
  }

  res.json({ ok: true });
}));

// ============================================================
// ADMIN
// ============================================================

// GET /api/rzp/admin/payments?status=paid|created|failed|conflict
router.get("/admin/payments", protect, adminOnly, async (req, res) => {
  try {
    const filter = {};
    const s = req.query.status;
    if (["created", "paid", "failed"].includes(s)) filter.status = s;
    if (s === "conflict") { filter.conflict = true; filter.conflictResolved = false; }
    if (["tech", "meditation"].includes(req.query.brand)) filter.brand = req.query.brand;

    const payments = await OnlinePayment.find(filter)
      .populate("user", "name email")
      .populate("bookingRef", "status date timeSlot meetLink")
      .sort({ createdAt: -1 })
      .limit(300);

    const paidAgg = await OnlinePayment.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const paidCount = await OnlinePayment.countDocuments({ status: "paid" });
    const openConflicts = await OnlinePayment.countDocuments({ conflict: true, conflictResolved: false });

    res.json({
      success: true,
      enabled: isEnabled(),
      payments,
      totals: { paid: paidAgg[0]?.total || 0, paidCount, openConflicts },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/rzp/admin/payments/:id/rebook  body: { date, timeSlot }
// A paid payment whose slot was taken → book it on a new slot (confirmed).
router.post("/admin/payments/:id/rebook", protect, adminOnly, async (req, res) => {
  try {
    const { date, timeSlot } = req.body;
    if (!DATE_RX.test(String(date || "")) || !timeSlot) {
      return res.status(400).json({ success: false, error: "Pick a date and time" });
    }
    const payment = await OnlinePayment.findById(req.params.id);
    if (!payment || payment.status !== "paid" || !payment.conflict) {
      return res.status(400).json({ success: false, error: "Only paid payments with a slot conflict can be rebooked" });
    }
    if (payment.bookingRef || await Booking.findOne({ onlinePayment: payment._id })) {
      return res.status(400).json({ success: false, error: "This payment already has a booking" });
    }
    if (await slotTaken(date, timeSlot)) {
      return res.status(409).json({ success: false, error: "That slot is taken. Pick another." });
    }
    const booking = await Booking.create({
      user: payment.user,
      packageId: String(payment.package),
      packageName: payment.packageName,
      packagePrice: payment.amount,
      packageDuration: payment.packageDuration || "—",
      brand: payment.brand,
      date, timeSlot,
      timezone: payment.booking?.timezone || "Asia/Kolkata",
      studentInfo: payment.booking?.studentInfo,
      status: "confirmed",
      paymentMethod: "razorpay",
      onlinePayment: payment._id,
      meetLink: null,
    });
    const updated = await OnlinePayment.findByIdAndUpdate(payment._id, {
      $set: {
        bookingRef: booking._id, conflictResolved: true,
        conflictNote: `Rebooked to ${date} ${timeSlot}`,
        "booking.date": date, "booking.timeSlot": timeSlot,
      },
    }, AFTER);
    if (booking.studentInfo?.email) {
      sendPaymentReceivedEmail(booking.studentInfo.email, booking, updated).catch(() => {});
    }
    res.json({ success: true, booking, payment: updated });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, error: "This payment already has a booking" });
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/rzp/admin/payments/:id/resolve  body: { note }
router.put("/admin/payments/:id/resolve", protect, adminOnly, async (req, res) => {
  try {
    const p = await OnlinePayment.findOneAndUpdate(
      { _id: req.params.id, conflict: true },
      { $set: { conflictResolved: true, conflictNote: clean(req.body.note, 500) } },
      AFTER
    );
    if (!p) return res.status(404).json({ success: false, error: "No open conflict for this payment" });
    res.json({ success: true, payment: p });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
module.exports._test = { fulfil, ensureCaptured };
