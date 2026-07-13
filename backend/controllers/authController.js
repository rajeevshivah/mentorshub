const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { sendPasswordResetEmail } = require("../utils/sendEmailExtra");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ============================================================
// GOOGLE SIGN-IN / SIGN-UP
// Frontend sends the Google credential (JWT). We verify it with
// Google, then log in an existing user or create a new one.
// Handles the case where the email already exists as a password
// account (links Google to it instead of erroring).
// ============================================================
exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, error: "Missing Google credential" });
    }

    // Verify the token really came from Google and is for OUR app
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ success: false, error: "Google account has no email" });
    }

    // Find by email (accounts are keyed on email)
    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      // Existing account — link Google if not already linked
      if (!user.googleId) {
        user.googleId = googleId;
        if (!user.avatar && picture) user.avatar = picture;
        // keep authProvider as-is if they had a password; otherwise mark google
        if (!user.password) user.authProvider = "google";
        await user.save();
      }
    } else {
      // New Google user — no password, no phone yet
      user = await User.create({
        name: name || email.split("@")[0],
        email: email.toLowerCase(),
        googleId,
        avatar: picture,
        authProvider: "google",
      });
    }

    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id, name: user.name, email: user.email,
        role: user.role, avatar: user.avatar,
        needsPhone: !user.phone,   // frontend can prompt for phone before booking
      },
    });
  } catch (err) {
    console.error("Google auth error:", err.message);
    res.status(401).json({ success: false, error: "Google sign-in failed" });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, college, year, skills } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, error: "Please fill all required fields" });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, error: "Email already registered" });
    }
    const user = await User.create({ name, email, phone, password, college, year, skills });
    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Register error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Please provide email and password" });
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }
    res.json({
      success: true,
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---- Update own profile (feature) ----
exports.updateProfile = async (req, res) => {
  try {
    const allowed = ["name", "phone", "college", "year", "skills"];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true, runValidators: true,
    }).select("-password");
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// FORGOT PASSWORD (Layer 4)
// Always responds success (don't leak which emails exist).
// ============================================================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: "Email required" });

    const user = await User.findOne({ email });
    // Generic response either way
    const genericMsg = "If that email is registered, a reset link has been sent.";

    if (!user) return res.json({ success: true, message: genericMsg });

    const rawToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Send the reset link back to the SITE the request came from
    // (MentorHub or talkWithShivah), as long as it's a trusted origin.
    const trusted = [
      "https://mentorshub.rajeevshivah.me",
      "https://talkwithshivah.rajeevshivah.me",
      "http://localhost:5173",
      "http://localhost:3000",
      process.env.FRONTEND_URL,
    ].filter(Boolean);
    const origin = req.headers.origin;
    const base = trusted.includes(origin)
      ? origin
      : (process.env.FRONTEND_URL || "https://mentorshub.rajeevshivah.me");
    const resetUrl = `${base}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail(user.email, user.name, resetUrl);
    } catch (e) {
      // roll back token if email failed
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      console.error("Reset email error:", e.message);
      return res.status(500).json({ success: false, error: "Could not send reset email" });
    }

    res.json({ success: true, message: genericMsg });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// RESET PASSWORD (Layer 4)
// ============================================================
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, error: "Token and new password required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
    }

    const hashed = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpire: { $gt: Date.now() },
    }).select("+resetPasswordToken +resetPasswordExpire");

    if (!user) {
      return res.status(400).json({ success: false, error: "Reset link is invalid or has expired" });
    }

    user.password = password; // pre-save hook hashes it
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({
      success: true,
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
