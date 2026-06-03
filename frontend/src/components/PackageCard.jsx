// ============================================================
// PackageCard — Reusable package card
// Used in both HomePage and BookingPage
// ============================================================
export default function PackageCard({ pkg, onBook, selected, selectable }) {
  return (
    <div
      onClick={() => selectable && onBook(pkg.id)}
      className={`relative bg-white/4 border rounded-2xl p-7 transition-all
        ${selectable ? "cursor-pointer hover:-translate-y-0.5" : "hover:-translate-y-1"}
        ${pkg.popular ? "border-yellow-500/40 bg-yellow-500/4" : "border-white/7 hover:border-white/15"}
        ${selected ? "border-yellow-500/50 bg-yellow-500/6" : ""}`}
    >
      {/* Popular badge */}
      {pkg.popular && (
        <span className="absolute top-4 right-4 bg-yellow-500/15 border border-yellow-500/30
          text-yellow-400 text-xs px-2 py-0.5 rounded-full font-medium">
          ⭐ Popular
        </span>
      )}

      {/* Selected badge */}
      {selected && (
        <span className="absolute top-4 right-4 bg-yellow-500/15 border border-yellow-500/30
          text-yellow-400 text-xs px-2 py-0.5 rounded-full font-medium">
          ✓ Selected
        </span>
      )}

      <div className="text-3xl mb-3">{pkg.icon}</div>
      <h3 className="font-display font-bold text-lg mb-1">{pkg.name}</h3>
      <div className="text-gray-400 text-xs mb-4">⏱ {pkg.duration}</div>
      <div className="font-display text-3xl font-black text-yellow-400 mb-1">
        ₹{pkg.price}
        <span className="text-gray-400 text-base font-normal">/session</span>
      </div>
      <p className="text-gray-400 text-sm my-4">{pkg.desc}</p>

      {/* Features list */}
      <ul className="space-y-2 mb-6">
        {pkg.features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
            <span className="w-4 h-4 rounded-full bg-green-500/15 text-green-400
              flex items-center justify-center text-xs flex-shrink-0">✓</span>
            {f}
          </li>
        ))}
      </ul>

      {/* Book button — only shown when not in selectable mode */}
      {!selectable && (
        <button
          onClick={() => onBook(pkg.id)}
          className="w-full bg-gradient-to-r from-yellow-500 to-yellow-300 text-black
            font-display font-bold py-2.5 rounded-xl hover:opacity-90 transition-all"
        >
          Book This Package
        </button>
      )}
    </div>
  );
}