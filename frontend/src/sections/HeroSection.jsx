// ============================================================
// HeroSection — Landing page hero
// ============================================================
import { STATS } from "../data/constants";

export default function HeroSection({ onBook }) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-24 text-center">

      {/* Available badge */}
      <div className="inline-flex items-center gap-2 bg-yellow-500/10 border
        border-yellow-500/20 rounded-full px-4 py-1.5 text-yellow-400 text-sm
        font-medium mb-6">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
        Available for sessions this week
      </div>

      {/* Headline */}
      <h1 className="font-display text-5xl md:text-7xl font-black leading-tight mb-6">
        Level Up Your<br />
        <span className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-teal-400
          bg-clip-text text-transparent">
          Tech Career
        </span><br />
        With Expert Mentorship
      </h1>

      <p className="text-gray-400 text-lg max-w-xl mx-auto mb-10">
        Get personalized guidance from a seasoned Full-Stack developer.
        BCA, BTech, MCA — roadmaps built just for you.
      </p>

      {/* CTA Buttons */}
      <div className="flex gap-4 justify-center flex-wrap">
        <button
          onClick={() => onBook()}
          className="bg-gradient-to-r from-yellow-500 to-yellow-300 text-black
            font-display font-bold px-8 py-3.5 rounded-xl hover:-translate-y-1
            transition-all hover:shadow-lg hover:shadow-yellow-500/25"
        >
          🚀 Book a Session
        </button>
        <button
          onClick={() => onBook()}
          className="border border-white/10 text-white font-display font-semibold
            px-8 py-3.5 rounded-xl hover:border-yellow-500/50 hover:text-yellow-400
            transition-all"
        >
          ✨ View Packages
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mt-16">
        {STATS.map(({ num, label }) => (
          <div key={label} className="bg-white/4 border border-white/7 rounded-xl p-5">
            <div className="font-display text-2xl font-black text-yellow-400">{num}</div>
            <div className="text-gray-400 text-xs mt-1">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}