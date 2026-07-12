// ============================================================
// seedPackages.js  — ONE-TIME migration
// Moves your 6 existing hardcoded packages into MongoDB so
// nothing is lost when the homepage switches to the API.
//
// Run once from the backend folder:
//   node scripts/seedPackages.js
//
// Safe to re-run: it skips packages whose name already exists
// for that brand (won't create duplicates).
// ============================================================
require("dotenv").config();
const mongoose = require("mongoose");
const Package = require("../models/Package");

const TECH_PACKAGES = [
  {
    name: "Quick Guidance", duration: "15 min", price: 299, icon: "⚡",
    popular: false, sortOrder: 1,
    desc: "Fast answers to your most pressing questions.",
    features: ["Career path advice", "Quick doubt resolution", "Next step roadmap", "Chat support 24h"],
  },
  {
    name: "Roadmap Session", duration: "30 min", price: 599, icon: "🗺️",
    popular: true, sortOrder: 2,
    desc: "Deep dive into your personalized learning roadmap.",
    features: ["Personalized roadmap", "Skill gap analysis", "Resource recommendations", "PDF summary post-call"],
  },
  {
    name: "Full Mentorship", duration: "60 min", price: 999, icon: "🚀",
    popular: false, sortOrder: 3,
    desc: "Comprehensive session covering skills and career strategy.",
    features: ["Everything in Roadmap", "Live coding walkthrough", "LinkedIn/GitHub review", "30-day follow-up plan"],
  },
  {
    name: "Resume Review", duration: "30 min", price: 499, icon: "📄",
    popular: false, sortOrder: 4,
    desc: "Get your resume noticed by top recruiters.",
    features: ["ATS optimization", "Formatting & design", "Keyword analysis", "3 revision rounds"],
  },
  {
    name: "Interview Prep", duration: "45 min", price: 799, icon: "🎯",
    popular: false, sortOrder: 5,
    desc: "Mock interviews with detailed feedback.",
    features: ["Mock technical interview", "HR round simulation", "DSA problem practice", "Feedback report"],
  },
  {
    name: "Project Guidance", duration: "60 min", price: 899, icon: "💻",
    popular: false, sortOrder: 6,
    desc: "Plan and build a portfolio project that stands out.",
    features: ["Project ideation", "Tech stack selection", "Architecture review", "Deployment walkthrough"],
  },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    let created = 0, skipped = 0;
    for (const p of TECH_PACKAGES) {
      const exists = await Package.findOne({ name: p.name, brand: "tech" });
      if (exists) { skipped++; continue; }
      await Package.create({ ...p, brand: "tech", active: true });
      created++;
    }

    console.log(`🎉 Done. Created: ${created}, Skipped (already existed): ${skipped}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
})();
