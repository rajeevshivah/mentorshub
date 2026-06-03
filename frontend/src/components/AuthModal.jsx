// ============================================================
// AuthModal — Login & Signup popup
// Uses AuthContext for actual API calls
// ============================================================
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function AuthModal({ onClose }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: ""
  });

  const { login, register, authLoading } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (tab === "login") {
      const result = await login(form.email, form.password);
      if (result.success) {
        showToast("Welcome back! 👋");
        onClose();
      } else {
        showToast(result.error, "error");
      }
    } else {
      if (!form.name || !form.phone) {
        showToast("Please fill all fields", "error");
        return;
      }
      const result = await register(form.name, form.email, form.password, form.phone);
      if (result.success) {
        showToast("Account created! 🎉");
        onClose();
      } else {
        showToast(result.error, "error");
      }
    }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-yellow-500/50 outline-none text-sm transition-colors";

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-dark-2 border border-white/10 rounded-2xl p-8 w-full max-w-sm">

        {/* Tab Switch */}
        <div className="flex gap-2 mb-6 bg-white/4 rounded-xl p-1">
          {["login", "signup"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-display font-semibold capitalize transition-all
                ${tab === t
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                  : "text-gray-400 hover:text-white"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <h3 className="font-display text-xl font-black mb-6">
          {tab === "login" ? "Welcome back 👋" : "Create account ✨"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "signup" && (
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Full Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
                placeholder="Rajeev Ranjan"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={inputClass}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {tab === "signup" && (
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputClass}
                placeholder="+91 98765 43210"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={authLoading}
            className={`w-full bg-gradient-to-r from-yellow-500 to-yellow-300 text-black
              font-display font-bold py-3 rounded-xl mt-2 transition-all
              ${authLoading ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"}`}
          >
            {authLoading
              ? "Please wait..."
              : tab === "login" ? "Login" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          {tab === "login" ? (
            <>No account?{" "}
              <span className="text-yellow-400 cursor-pointer hover:underline"
                onClick={() => setTab("signup")}>Sign up free</span>
            </>
          ) : (
            <>Already registered?{" "}
              <span className="text-yellow-400 cursor-pointer hover:underline"
                onClick={() => setTab("login")}>Login</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}