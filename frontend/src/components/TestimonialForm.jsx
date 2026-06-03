// ============================================================
// TestimonialForm — Students submit their own reviews
// Admin approves before showing publicly
// ============================================================
import { useState } from "react";
import { testimonialAPI } from "../utils/api";
import { useToast } from "../context/ToastContext";

export default function TestimonialForm({ onClose }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", college: "", year: "",
    rating: 5, text: "", domain: "Tech Mentorship",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.text) {
      showToast("Please fill all required fields", "error");
      return;
    }
    if (form.text.length < 20) {
      showToast("Please write at least 20 characters", "error");
      return;
    }
    setLoading(true);
    try {
      await testimonialAPI.submit(form);
      setSubmitted(true);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-yellow-500/50 outline-none text-sm transition-colors";

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-dark-2 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {submitted ? (
          /* Success state */
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">🙏</div>
            <h3 className="font-display text-2xl font-black mb-3">
              Thank you so much!
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Your testimonial has been submitted and will appear on the platform
              after a quick review. This means a lot — it helps other students
              make the right decision.
            </p>
            <button
              onClick={onClose}
              className="bg-gradient-to-r from-yellow-500 to-yellow-300 text-black
                font-display font-bold px-8 py-3 rounded-xl"
            >
              Close
            </button>
          </div>
        ) : (
          /* Form */
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-display text-xl font-black">
                  Share Your Experience ⭐
                </h3>
                <p className="text-gray-400 text-xs mt-1">
                  Help other students make the right decision
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-xl transition-colors ml-4"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Rating */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  Your Rating *
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setForm({ ...form, rating: star })}
                      className={`text-2xl transition-all hover:scale-110 ${
                        star <= form.rating ? "text-yellow-400" : "text-gray-600"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-gray-400 text-sm ml-2 self-center">
                    {["", "Poor", "Fair", "Good", "Great", "Excellent!"][form.rating]}
                  </span>
                </div>
              </div>

              {/* Name + Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Rahul Sharma"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="rahul@email.com"
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              {/* College + Year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">
                    College / Company
                  </label>
                  <input
                    value={form.college}
                    onChange={(e) => setForm({ ...form, college: e.target.value })}
                    placeholder="VIT, TCS, Startup..."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">
                    Year / Role
                  </label>
                  <input
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    placeholder="3rd Year, Fresher..."
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Session type */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Session Type
                </label>
                <select
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  className={inputClass}
                >
                  <option>Tech Mentorship</option>
                  <option>Career Guidance</option>
                  <option>Resume Review</option>
                  <option>Interview Prep</option>
                  <option>Project Guidance</option>
                  <option>MERN Stack</option>
                  <option>Data Science</option>
                </select>
              </div>

              {/* Review text */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Your Review * <span className="text-gray-500">(min 20 characters)</span>
                </label>
                <textarea
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  rows={4}
                  placeholder="How did the session help you? What changed for you after the session? Be specific — your honest experience helps other students."
                  className={`${inputClass} resize-none`}
                  required
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {form.text.length} characters
                  {form.text.length < 20 && form.text.length > 0 && (
                    <span className="text-red-400 ml-2">
                      ({20 - form.text.length} more needed)
                    </span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-gradient-to-r from-yellow-500 to-yellow-300 text-black
                  font-display font-bold py-3 rounded-xl transition-all
                  ${loading ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"}`}
              >
                {loading ? "Submitting..." : "Submit My Review ⭐"}
              </button>

              <p className="text-center text-xs text-gray-500">
                Your review will appear after a quick approval · No spam, ever
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}