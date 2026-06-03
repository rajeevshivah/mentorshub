import { TESTIMONIALS } from "../data/constants";

export default function TestimonialsSection() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16 border-t border-white/7">
      <span className="inline-flex items-center gap-2 bg-blue-500/10 border
        border-blue-500/20 rounded-full px-3 py-1 text-blue-400 text-xs
        font-medium mb-4">
        Testimonials
      </span>
      <h2 className="font-display text-3xl font-black mb-10">
        Students Who Changed Their Trajectory
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="bg-white/4 border border-white/7 rounded-2xl
            p-6 hover:border-white/12 transition-all">
            <div className="text-yellow-400 text-sm mb-3">{"★".repeat(t.stars)}</div>
            <p className="text-gray-300 text-sm italic leading-relaxed mb-5">
              "{t.text}"
            </p>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center
                  font-display font-bold text-xs flex-shrink-0"
                style={{ background: t.color + "22", color: t.color }}
              >
                {t.avatar}
              </div>
              <div>
                <div className="font-semibold text-sm">{t.name}</div>
                <div className="text-gray-400 text-xs">{t.college}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}