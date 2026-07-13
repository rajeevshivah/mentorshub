// ============================================================
// One-time seed: talkWithShivah (meditation) packages.
// Run from the backend folder:  node scripts/seedMeditationPackages.js
// Idempotent — skips any package that already exists.
// Edit freely afterwards from the MentorHub admin panel (brand: meditation).
// ============================================================
require("dotenv").config();
const mongoose = require("mongoose");
const Package = require("../models/Package");

const MEDITATION_PACKAGES = [
  {
    name: "First Sitting",
    duration: "45 min",
    price: 499,
    icon: "🪷",
    popular: true,
    desc: "For complete beginners. We look at how your mind actually behaves and choose one simple practice that fits it.",
    features: [
      "No experience needed",
      "One practice chosen for you",
      "Clear daily routine to follow",
      "Honest answers to your questions",
    ],
    sortOrder: 1,
  },
  {
    name: "Vigyana Bhairava Practice",
    duration: "60 min",
    price: 799,
    icon: "🕉️",
    popular: false,
    desc: "Working with the 112 dharanas one at a time — turning verses you have read into practice you can actually do.",
    features: [
      "Techniques matched to your temperament",
      "Guided practice in-session",
      "Text references to sit with",
      "Follow-up practice notes",
    ],
    sortOrder: 2,
  },
  {
    name: "Philosophy Dialogue",
    duration: "60 min",
    price: 599,
    icon: "📿",
    popular: false,
    desc: "An unhurried conversation on Kashmir Shaivism, Advaita Vedanta, or the Upanishads — grounded in practice, not debate.",
    features: [
      "Bring your questions and confusions",
      "Recognition over belief",
      "Texts connected to daily life",
      "No prior study required",
    ],
    sortOrder: 3,
  },
  {
    name: "Personal Sadhana Design",
    duration: "75 min",
    price: 999,
    icon: "🌙",
    popular: false,
    desc: "For practitioners whose practice has gone dry or needs structure. We assess honestly and design a daily sadhana that holds.",
    features: [
      "Full review of your current practice",
      "Written daily sadhana plan",
      "What to do when it gets difficult",
      "One follow-up email included",
    ],
    sortOrder: 4,
  },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    let created = 0, skipped = 0;
    for (const p of MEDITATION_PACKAGES) {
      const exists = await Package.findOne({ name: p.name, brand: "meditation" });
      if (exists) { skipped++; continue; }
      await Package.create({ ...p, brand: "meditation", active: true });
      created++;
    }

    console.log(`🎉 Done. Created: ${created}, Skipped (already existed): ${skipped}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
})();
