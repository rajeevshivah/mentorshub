// ============================================================
// Re-seed: talkWithShivah packages, v3 — adds "Get Your Focus Back".
//
// Use this INSTEAD of V2 (it contains everything V2 had, plus one).
// Safe whether or not you already ran V2:
//   1. Deactivates any meditation package NOT in this list
//   2. Creates missing ones, reactivates matching ones
// Run from the backend folder:  node scripts/seedMeditationPackagesV3.js
// ============================================================
require("dotenv").config();
const mongoose = require("mongoose");
const Package = require("../models/Package");

const MEDITATION_PACKAGES_V3 = [
  {
    name: "Learn to Meditate",
    duration: "45 min",
    price: 499,
    icon: "🌱",
    popular: true,
    desc: "Never meditated, or only tried an app? We start from zero. You leave knowing exactly how to sit, what to do, and for how long each day.",
    features: [
      "No experience needed at all",
      "One simple technique, taught live",
      "A 10-minute daily routine to follow",
      "Your questions answered honestly",
    ],
    sortOrder: 1,
  },
  {
    name: "Calm an Overthinking Mind",
    duration: "60 min",
    price: 699,
    icon: "🌊",
    popular: false,
    desc: "For stress, racing thoughts, and the mind that won't switch off. Practical meditation tools you can use during a busy day — not therapy, and honest about that.",
    features: [
      "Understand your own stress pattern",
      "Short practices for the middle of a workday",
      "A wind-down routine for nights",
      "Practice notes sent after the session",
    ],
    sortOrder: 2,
  },
  {
    name: "Get Your Focus Back",
    duration: "60 min",
    price: 699,
    icon: "🎯",
    popular: false,
    desc: "Endless scrolling, can't finish a page, attention in pieces. Your focus isn't broken — it's been trained to break. Attention is a muscle, and it retrains.",
    features: [
      "What scrolling actually does to attention",
      "A daily attention-training practice",
      "Phone habits that hold (no 'just delete everything')",
      "A 30-day plan with an email check-in",
    ],
    sortOrder: 3,
  },
  {
    name: "Make Meditation Stick",
    duration: "60 min",
    price: 699,
    icon: "🔁",
    popular: false,
    desc: "You've started meditating two or three times and it never lasted. That's normal, and fixable. We find why it didn't stick and rebuild it simpler.",
    features: [
      "An honest look at why it stopped",
      "A routine that fits your real schedule",
      "What to do when it gets boring",
      "A check-in on your practice by email",
    ],
    sortOrder: 4,
  },
  {
    name: "Go Deeper",
    duration: "75 min",
    price: 999,
    icon: "🌙",
    popular: false,
    desc: "For those already sitting regularly who feel there's more. Subtler techniques, questions arising from your practice, and the old texts — only if you want them.",
    features: [
      "A full review of your current practice",
      "Subtler techniques, one step at a time",
      "Texts and traditions only if you ask",
      "A written plan for the next phase",
    ],
    sortOrder: 5,
  },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const newNames = MEDITATION_PACKAGES_V3.map((p) => p.name);
    const retired = await Package.updateMany(
      { brand: "meditation", name: { $nin: newNames } },
      { $set: { active: false } }
    );
    console.log(`🗂  Old meditation packages deactivated: ${retired.modifiedCount}`);

    let created = 0, kept = 0;
    for (const p of MEDITATION_PACKAGES_V3) {
      const exists = await Package.findOne({ name: p.name, brand: "meditation" });
      if (exists) {
        exists.active = true;
        exists.sortOrder = p.sortOrder;
        await exists.save();
        kept++;
        continue;
      }
      await Package.create({ ...p, brand: "meditation", active: true });
      created++;
    }

    console.log(`🎉 Done. Created: ${created}, Already existed (kept active): ${kept}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
})();
