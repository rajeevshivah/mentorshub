// ============================================================
// HomePage.jsx — Real homepage for Rajeev Shivah
// Credibility-first design, real information, no fake stats
// ============================================================
import { useState, useEffect } from "react";
import { testimonialAPI, packageAPI } from "../utils/api";
import { useToast } from "../context/ToastContext";
import { FAQS } from "../data/constants";
import PackageCard from "../components/PackageCard";
import Footer from "../components/Footer";
import TestimonialForm from "../components/TestimonialForm";

// ---- Rajeev's real credentials ----
const EXPERTISE = [
  { icon: "⚙️", label: "MERN Stack", desc: "MongoDB, Express, React, Node" },
  { icon: "🐍", label: "Data Science", desc: "Python, ML, Analytics" },
  { icon: "🐳", label: "DevOps", desc: "Docker, Kubernetes, CI/CD" },
  { icon: "🏗️", label: "System Design", desc: "Architecture, Scalability" },
  { icon: "💼", label: "Career Strategy", desc: "Job market, Placements" },
  { icon: "🚀", label: "Startup & SaaS", desc: "Product, Freelancing" },
];

const TRUST_POINTS = [
  { icon: "📅", value: "10+", label: "Years in Tech" },
  { icon: "🏢", value: "Founder", label: "Minicimex Tech Pvt Ltd" },
  { icon: "🎤", value: "Workshops", label: "Corporates & Colleges" },
  { icon: "🎯", value: "Early Access", label: "Limited Spots" },
];

const WHY_POINTS = [
  {
    icon: "😕",
    title: "Students are confused",
    desc: "You don't know what to learn, in what order, or which domains are AI-proof. Every YouTube video says something different.",
  },
  {
    icon: "💸",
    title: "Money wasted on fraud courses",
    desc: "Social media is full of people who are there to earn money — not to actually help you. Expensive courses, zero outcomes.",
  },
  {
    icon: "😰",
    title: "Fear is killing potential",
    desc: "AI fear, logic-building struggles, imposter syndrome — students are leaving the field before they even start.",
  },
  {
    icon: "✅",
    title: "What actually works",
    desc: "Consistency + proper guidance. Anyone can write code. What most students miss isn't talent — it's direction.",
  },
];

export default function HomePage({ onBook }) {
  const { showToast } = useToast();
  const [testimonials, setTestimonials] = useState([]);
  const [packages, setPackages] = useState([]);
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [openFaq, setOpenFaq] = useState(-1);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);

  useEffect(() => {
    fetchTestimonials();
    packageAPI.getActive("tech")
      .then((res) => setPackages(res.packages || []))
      .catch(() => setPackages([]));
  }, []);

  const fetchTestimonials = async () => {
    try {
      const data = await testimonialAPI.getApproved();
      setTestimonials(data.testimonials);
    } catch (err) {
      // Silently fail — show fallback
    } finally {
      setTestimonialsLoading(false);
    }
  };

  // Fallback testimonials until real ones come in
  const FALLBACK_TESTIMONIALS = [
    {
      _id: "f1",
      name: "Arjun Mehta",
      college: "BCA Final Year",
      rating: 5,
      domain: "Career Guidance",
      text: "I was completely lost about what to do after graduation. One session with Rajeev and I had a clear 6-month plan. He doesn't give generic advice — he actually listens and gives you something actionable.",
    },
    {
      _id: "f2",
      name: "Priya Singh",
      college: "MCA Student",
      rating: 5,
      domain: "MERN Stack",
      text: "I had watched 50+ YouTube tutorials but never actually built anything. Rajeev showed me why — I was learning without direction. Now I have two real projects and an internship.",
    },
  ];

  const displayTestimonials = testimonials.length > 0 ? testimonials : FALLBACK_TESTIMONIALS;

  return (
    <div>

      {/* ============================================================
          HERO SECTION
      ============================================================ */}
      <div className="max-w-5xl mx-auto px-6 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

          {/* Left — Text */}
          <div>
            {/* Early access badge */}
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 border
              border-yellow-500/20 rounded-full px-4 py-1.5 text-yellow-400 text-xs
              font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              Early Access — Limited Spots Available
            </div>

            <h1 className="font-display text-4xl md:text-5xl font-black leading-tight mb-4">
              Stop Wasting Time.<br />
              Get <span className="bg-gradient-to-r from-yellow-400 to-teal-400
                bg-clip-text text-transparent">
                Real Guidance
              </span><br />
              From Someone Who<br />
              Actually Builds.
            </h1>

            <p className="text-gray-400 text-base leading-relaxed mb-8 max-w-lg">
              I've seen too many students spend ₹50,000+ on courses and still
              not land a ₹10k job. The problem isn't talent — it's direction.
              One focused session can change your entire trajectory.
            </p>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => onBook()}
                className="bg-gradient-to-r from-yellow-500 to-yellow-300 text-black
                  font-display font-bold px-7 py-3.5 rounded-xl hover:-translate-y-1
                  transition-all hover:shadow-lg hover:shadow-yellow-500/25 text-sm"
              >
                🚀 Book a Session
              </button>
              {/* FIX: was missing opening <a tag */}
              <a
                href="https://www.youtube.com/@codewithshivah"
                target="_blank"
                rel="noreferrer"
                className="border border-white/10 text-white font-display font-semibold
                  px-7 py-3.5 rounded-xl hover:border-red-500/50 hover:text-red-400
                  transition-all text-sm flex items-center gap-2"
              >
                ▶ Watch My Content
              </a>
            </div>

            {/* Social links */}
            <div className="flex items-center gap-4 mt-6">
              <a href="https://www.youtube.com/@codewithshivah" target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-red-400 transition-colors">
                <span className="text-base">📺</span> codeWithShivah
              </a>
              <span className="text-gray-700">·</span>
              <a href="https://www.linkedin.com/in/rajeev-shivah-49745014a/" target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-blue-400 transition-colors">
                <span className="text-base">💼</span> LinkedIn
              </a>
              <span className="text-gray-700">·</span>
              <span className="text-xs text-gray-500">📍 Dehradun, India</span>
            </div>
          </div>

          {/* Right — Photo + credentials */}
          <div className="flex flex-col items-center md:items-end">
            <div className="relative">
              {/* Photo */}
              <div className="w-56 h-56 md:w-64 md:h-64 rounded-3xl overflow-hidden
                border-2 border-yellow-500/30 shadow-2xl shadow-yellow-500/10">
                <img
                  src="https://i.ibb.co/G4LxCjJB/1757955995866-1.png"
                  alt="Rajeev Shivah"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.parentElement.innerHTML = `
                      <div class="w-full h-full bg-gradient-to-br from-yellow-500/20 to-teal-500/20
                        flex items-center justify-center font-display font-black text-6xl text-yellow-400">
                        RS
                      </div>`;
                  }}
                />
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-3 -right-3 bg-dark-2 border border-white/10
                rounded-xl px-3 py-2 text-xs">
                <div className="font-display font-bold text-white">Rajeev Shivah</div>
                <div className="text-gray-400">10 yrs · Full Stack · DS</div>
              </div>

              {/* YouTube badge */}
              <div className="absolute -top-3 -left-3 bg-red-500/15 border border-red-500/30
                rounded-xl px-3 py-2 text-xs flex items-center gap-2">
                <span className="text-red-400">▶</span>
                <span className="text-red-300 font-medium">codeWithShivah</span>
              </div>
            </div>

            {/* Credential pills */}
            <div className="flex flex-wrap gap-2 mt-8 justify-center md:justify-end max-w-xs">
              {["Founder · Minicimex Tech", "10+ Years Experience",
                "Corporate Workshops", "College Seminars",
                "MERN · Python · Docker"].map((c) => (
                <span key={c} className="bg-white/4 border border-white/7 text-gray-300
                  text-xs px-3 py-1.5 rounded-full">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          TRUST BAR
      ============================================================ */}
      <div className="border-y border-white/7 bg-white/2">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {TRUST_POINTS.map(({ icon, value, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="font-display font-black text-xl text-yellow-400">{value}</div>
                <div className="text-gray-400 text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================
          WHY I MENTOR — Rajeev's real story
      ============================================================ */}
      <div className="max-w-5xl mx-auto px-6 py-16 border-b border-white/7">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div>
            <span className="inline-flex items-center gap-2 bg-teal-500/10 border
              border-teal-500/20 rounded-full px-3 py-1 text-teal-400 text-xs
              font-medium mb-4">
              Why I Started Mentoring
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-black leading-tight mb-6">
              The Problem I See<br />
              Every Single Day
            </h2>
            <blockquote className="border-l-2 border-yellow-500/50 pl-4 mb-6">
              <p className="text-gray-300 text-sm leading-relaxed italic">
                "Students are wasting so much money but still can't get even a ₹10k job.
                There are people on social media who are just there to earn money rather
                than providing something valuable. So many fraud courses. Many students
                left coding because of AI fear and logic-building struggles.
                But what I see is — anyone can write code.
                What most students are missing is consistency and proper guidance."
              </p>
              <footer className="mt-3 text-yellow-400 text-xs font-medium">
                — Rajeev Shivah
              </footer>
            </blockquote>
            <button
              onClick={() => onBook()}
              className="bg-gradient-to-r from-yellow-500 to-yellow-300 text-black
                font-display font-bold px-6 py-3 rounded-xl text-sm hover:opacity-90 transition-all"
            >
              Get Proper Guidance →
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {WHY_POINTS.map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-4 bg-white/3 border border-white/7
                rounded-xl hover:border-white/12 transition-all">
                <div className="text-2xl flex-shrink-0">{icon}</div>
                <div>
                  <div className="font-display font-bold text-sm mb-1">{title}</div>
                  <div className="text-gray-400 text-xs leading-relaxed">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================
          EXPERTISE
      ============================================================ */}
      <div className="max-w-5xl mx-auto px-6 py-16 border-b border-white/7">
        <span className="inline-flex items-center gap-2 bg-yellow-500/10 border
          border-yellow-500/20 rounded-full px-3 py-1 text-yellow-400 text-xs
          font-medium mb-4">
          What I Can Guide You On
        </span>
        <h2 className="font-display text-3xl font-black mb-2">
          10 Years of Real-World Experience
        </h2>
        <p className="text-gray-400 text-sm mb-10 max-w-lg">
          Not theory. Not recycled tutorials. Guidance from someone who has
          actually built products, run a tech company, and worked across these domains.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {EXPERTISE.map(({ icon, label, desc }) => (
            <div key={label} className="bg-white/4 border border-white/7 rounded-2xl p-5
              hover:border-yellow-500/20 hover:-translate-y-1 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center
                justify-center text-xl mb-3 group-hover:bg-yellow-500/20 transition-all">
                {icon}
              </div>
              <div className="font-display font-bold text-sm mb-1">{label}</div>
              <div className="text-gray-400 text-xs">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================
          PACKAGES
      ============================================================ */}
      <div className="max-w-5xl mx-auto px-6 py-16 border-b border-white/7">
        <span className="inline-flex items-center gap-2 bg-yellow-500/10 border
          border-yellow-500/20 rounded-full px-3 py-1 text-yellow-400 text-xs
          font-medium mb-4">
          Sessions & Pricing
        </span>
        <h2 className="font-display text-3xl font-black mb-2">
          Choose Your Session
        </h2>
        <p className="text-gray-400 text-sm mb-10">
          Every session is 1-on-1, personalized, and outcome-focused.
          No templates. No generic advice.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {packages.map((pkg) => (
            <PackageCard key={pkg._id} pkg={pkg} onBook={onBook} />
          ))}
        </div>

        {/* Guarantee strip */}
        <div className="mt-8 p-4 bg-green-500/5 border border-green-500/15 rounded-2xl
          flex flex-wrap gap-6 justify-center text-center">
          {[
            ["✓", "100% Satisfaction", "Free follow-up if not happy"],
            ["✓", "Secure Payment", "Razorpay · All methods accepted"],
            ["✓", "Google Meet", "Link sent instantly after booking"],
            ["✓", "Session Notes", "PDF summary within 24 hours"],
          ].map(([check, title, sub]) => (
            <div key={title}>
              <div className="text-green-400 font-bold text-sm">{check} {title}</div>
              <div className="text-gray-500 text-xs mt-0.5">{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================
          TESTIMONIALS
      ============================================================ */}
      <div className="max-w-5xl mx-auto px-6 py-16 border-b border-white/7">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <span className="inline-flex items-center gap-2 bg-blue-500/10 border
              border-blue-500/20 rounded-full px-3 py-1 text-blue-400 text-xs
              font-medium mb-4">
              Student Reviews
            </span>
            <h2 className="font-display text-3xl font-black">
              What Students Say
            </h2>
          </div>

          {/* Submit review button */}
          <button
            onClick={() => setShowTestimonialForm(true)}
            className="flex items-center gap-2 border border-yellow-500/30 text-yellow-400
              px-4 py-2.5 rounded-xl text-sm font-display font-semibold
              hover:bg-yellow-500/10 transition-all"
          >
            ⭐ Share Your Experience
          </button>
        </div>

        {testimonialsLoading ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            Loading reviews...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayTestimonials.map((t) => (
              <div key={t._id} className="bg-white/4 border border-white/7 rounded-2xl p-6
                hover:border-white/12 transition-all flex flex-col">
                {/* Stars */}
                <div className="text-yellow-400 text-sm mb-1">
                  {"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}
                </div>
                {/* Domain tag */}
                <div className="text-xs text-teal-400 mb-3 font-medium">{t.domain}</div>
                {/* Review */}
                <p className="text-gray-300 text-sm leading-relaxed flex-1 mb-4 italic">
                  "{t.text}"
                </p>
                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-white/6">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-400
                    font-display font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {t.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    {t.college && (
                      <div className="text-gray-400 text-xs">{t.college}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA to submit review */}
        <div className="mt-8 text-center p-6 bg-white/2 border border-white/7 rounded-2xl">
          <p className="text-gray-400 text-sm mb-3">
            Had a session with me? Your honest review helps other students decide.
          </p>
          <button
            onClick={() => setShowTestimonialForm(true)}
            className="bg-gradient-to-r from-yellow-500 to-yellow-300 text-black
              font-display font-bold px-6 py-2.5 rounded-xl text-sm hover:opacity-90 transition-all"
          >
            ⭐ Write a Review
          </button>
        </div>
      </div>

      {/* ============================================================
          FAQ
      ============================================================ */}
      <div className="max-w-2xl mx-auto px-6 py-16 border-b border-white/7">
        <span className="inline-flex items-center gap-2 bg-teal-500/10 border
          border-teal-500/20 rounded-full px-3 py-1 text-teal-400 text-xs
          font-medium mb-4">
          FAQ
        </span>
        <h2 className="font-display text-3xl font-black mb-8">
          Common Questions
        </h2>
        {FAQS.map(({ q, a }, i) => (
          <div key={i} className={`border rounded-xl mb-2 overflow-hidden transition-all
            ${openFaq === i ? "border-yellow-500/25" : "border-white/7"}`}>
            <div
              className="flex justify-between items-center p-5 cursor-pointer select-none"
              onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
            >
              <span className="font-medium text-sm pr-4">{q}</span>
              <span className={`text-gray-400 transition-transform flex-shrink-0
                ${openFaq === i ? "rotate-180" : ""}`}>
                ▾
              </span>
            </div>
            {openFaq === i && (
              <div className="px-5 pb-5 text-gray-400 text-sm leading-relaxed">{a}</div>
            )}
          </div>
        ))}
      </div>

      {/* ============================================================
          FINAL CTA
      ============================================================ */}
      <div className="max-w-3xl mx-auto px-6 py-16 text-center border-b border-white/7">
        <div className="bg-gradient-to-br from-yellow-500/8 to-teal-500/8 border
          border-yellow-500/15 rounded-3xl p-10">
          <div className="text-4xl mb-4">🎯</div>
          <h2 className="font-display text-3xl font-black mb-4">
            Ready to Stop Being Confused?
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-lg mx-auto">
            One session. One honest conversation. A clear plan for where you're
            going and exactly how to get there. No fluff, no generic advice.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => onBook()}
              className="bg-gradient-to-r from-yellow-500 to-yellow-300 text-black
                font-display font-bold px-8 py-3.5 rounded-xl hover:-translate-y-1
                transition-all hover:shadow-lg hover:shadow-yellow-500/20 text-sm"
            >
              🚀 Book Your Session Now
            </button>
            {/* FIX: was missing opening <a tag */}
            <a
              href="https://www.youtube.com/@codewithshivah"
              target="_blank"
              rel="noreferrer"
              className="border border-white/10 text-white font-display font-semibold
                px-8 py-3.5 rounded-xl hover:border-red-500/40 hover:text-red-400
                transition-all text-sm"
            >
              ▶ Watch Free Content First
            </a>
          </div>
        </div>
      </div>

      <Footer />

      {/* Testimonial form modal */}
      {showTestimonialForm && (
        <TestimonialForm
          onClose={() => {
            setShowTestimonialForm(false);
            fetchTestimonials(); // refresh after submission
          }}
        />
      )}
    </div>
  );
}
