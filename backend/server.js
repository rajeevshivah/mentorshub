require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const slotRoutes = require("./routes/slotRoutes");
const adminRoutes = require("./routes/adminRoutes");
const testimonialRoutes = require("./routes/testimonialRoutes");
const packageRoutes = require("./routes/packageRoutes");   // Phase 1
const cronRoutes = require("./routes/cronRoutes");          // Layer 2
const settingsRoutes = require("./routes/settingsRoutes");  // UPI QR upload
const razorpayRoutes = require("./routes/razorpay");        // Razorpay online payments

connectDB();

const app = express();

app.use(helmet());

// CORS — filter out undefined origins (e.g. when FRONTEND_URL unset)
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://mentorshub-five.vercel.app",
  "https://rajeevshivah.me",
  "https://www.rajeevshivah.me",
  "https://mentorshub.rajeevshivah.me",
  "https://talkwithshivah.rajeevshivah.me",
  "https://www.minicimextech.com",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,                        // was 100 — too low; admin dashboard fires many calls per load
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Please wait a moment and try again." },
});
app.use("/api/", limiter);

// Settings routes carry an uploaded QR image (base64), so they get a larger
// body limit. Mounted BEFORE the global 100kb parser so this one handles them.
app.use("/api/settings", express.json({ limit: "3mb" }), settingsRoutes);

// Razorpay webhook must receive the RAW body (its signature is computed on
// the exact bytes). Registered BEFORE express.json so the JSON parser skips it.
app.use("/api/rzp/webhook", express.raw({ type: "*/*", limit: "1mb" }));

app.use(express.json());
app.use(morgan("dev"));

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/cron", cronRoutes);
app.use("/api/rzp", razorpayRoutes);

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "MentorHub API is running 🚀" });
});

app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
