import { PACKAGES } from "../data/constants";
import PackageCard from "../components/PackageCard";

export default function PackagesSection({ onBook }) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16 border-t border-white/7">
      <span className="inline-flex items-center gap-2 bg-yellow-500/10 border
        border-yellow-500/20 rounded-full px-3 py-1 text-yellow-400 text-xs
        font-medium mb-4">
        Packages
      </span>
      <h2 className="font-display text-3xl md:text-4xl font-black mb-2">
        Choose Your Growth Package
      </h2>
      <p className="text-gray-400 mb-10">
        Transparent pricing, premium guidance. Every session is personalized to your goals.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {PACKAGES.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} onBook={onBook} />
        ))}
      </div>
    </div>
  );
}