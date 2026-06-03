import { useState } from "react";
import { FAQS } from "../data/constants";

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(-1);

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 border-t border-white/7">
      <span className="inline-flex items-center gap-2 bg-teal-500/10 border
        border-teal-500/20 rounded-full px-3 py-1 text-teal-400 text-xs
        font-medium mb-4">
        FAQ
      </span>
      <h2 className="font-display text-3xl font-black mb-8">Questions Answered</h2>

      {FAQS.map(({ q, a }, i) => (
        <div
          key={i}
          className={`border rounded-xl mb-2 overflow-hidden transition-all
            ${openIndex === i ? "border-yellow-500/25" : "border-white/7"}`}
        >
          <div
            className="flex justify-between items-center p-5 cursor-pointer select-none"
            onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
          >
            <span className="font-medium text-sm pr-4">{q}</span>
            <span className={`text-gray-400 transition-transform flex-shrink-0
              ${openIndex === i ? "rotate-180" : ""}`}>
              ▾
            </span>
          </div>
          {openIndex === i && (
            <div className="px-5 pb-5 text-gray-400 text-sm leading-relaxed">{a}</div>
          )}
        </div>
      ))}
    </div>
  );
}