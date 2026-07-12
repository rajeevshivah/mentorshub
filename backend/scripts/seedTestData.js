// ============================================================
// seedTestData.js — LOCAL TESTING ONLY
// Seeds time slots + one admin user so a fresh test DB is usable.
// Run from backend/:  node scripts/seedTestData.js
//
// Reads admin creds from env (or uses defaults). CHANGE THE PASSWORD.
// ============================================================
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Slot = require("../models/Slot");

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@local.test";
const ADMIN_PASS = process.env.SEED_ADMIN_PASS || "admin123";

const SLOTS = [
  "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
];

(async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI not set in .env");

    // Safety: refuse to run against a DB that doesn't look like a test DB
    if (!/test|local|dev/i.test(uri)) {
      console.warn("⚠️  Your MONGODB_URI doesn't contain 'test'/'local'/'dev'.");
      console.warn("    This script is for a TEST database. If this is prod, STOP now.");
      console.warn("    Set SEED_FORCE=1 to run anyway.\n");
      if (!process.env.SEED_FORCE) process.exit(1);
    }

    await mongoose.connect(uri);
    console.log("✅ Connected:", mongoose.connection.name);

    // --- Slots ---
    let slotCount = 0;
    for (const time of SLOTS) {
      const exists = await Slot.findOne({ time });
      if (!exists) {
        await Slot.create({ time, isActive: true });
        slotCount++;
      }
    }
    console.log(`🕐 Slots created: ${slotCount} (skipped ${SLOTS.length - slotCount} existing)`);

    // --- Admin user ---
    let admin = await User.findOne({ email: ADMIN_EMAIL });
    if (admin) {
      admin.role = "admin";
      await admin.save();
      console.log(`👤 Existing user promoted to admin: ${ADMIN_EMAIL}`);
    } else {
      admin = await User.create({
        name: "Local Admin",
        email: ADMIN_EMAIL,
        phone: "+910000000000",
        password: ADMIN_PASS, // hashed by the pre-save hook
        role: "admin",
      });
      console.log(`👤 Admin created: ${ADMIN_EMAIL} / ${ADMIN_PASS}`);
    }

    console.log("\n🎉 Test data ready. Log in with the admin above to see the admin panel.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
})();
