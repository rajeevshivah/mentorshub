import { SERVICES } from "../data/constants";

export default function ServicesSection() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16 border-t border-white/7">
      <span className="inline-flex items-center gap-2 bg-teal-500/10 border
        border-teal-500/20 rounded-full px-3 py-1 text-teal-400 text-xs
        font-medium mb-4">
        What I Offer
      </span>
      <h2 className="font-display text-3xl md:text-4xl font-black mb-10">
        Expert Guidance Across<br />Every Tech Domain
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SERVICES.map(({ icon, name, desc }) => (
          <div key={name} className="bg-white/4 border border-white/7 rounded-2xl p-6
            hover:border-white/15 hover:-translate-y-1 transition-all">
            <div className="w-11 h-11 rounded-xl bg-yellow-500/10 flex items-center
              justify-center text-xl mb-4">
              {icon}
            </div>
            <h3 className="font-display font-bold text-base mb-2">{name}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}