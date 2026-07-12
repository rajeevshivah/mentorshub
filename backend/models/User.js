const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String },                          // optional (Google users add it later)
  password: { type: String, minlength: 6, select: false }, // optional for Google-only accounts
  googleId: { type: String },                       // set for Google sign-in accounts
  avatar: { type: String },                         // Google profile picture
  authProvider: { type: String, enum: ["local", "google"], default: "local" },
  role: { type: String, enum: ["student", "admin"], default: "student" },
  college: { type: String },
  year: { type: String },
  skills: { type: String },

  // ---- Password reset (Layer 4) ----
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpire: { type: Date, select: false },
}, { timestamps: true });

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false; // Google-only account, no password set
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate a reset token: returns the RAW token (emailed to user),
// stores only the HASH in the DB (so a DB leak can't be used to reset).
userSchema.methods.createPasswordResetToken = function () {
  const rawToken = crypto.randomBytes(32).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");
  this.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 min
  return rawToken;
};

module.exports = mongoose.model("User", userSchema);
