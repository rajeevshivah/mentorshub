// ============================================================
// AuthModal — Login / Signup / Forgot password
// ============================================================
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { authAPI } from "../utils/api";

export default function AuthModal({ onClose }) {
  const [tab, setTab] = useState("login"); // login | signup | forgot
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const { login, register, loginWithGoogle, authLoading } = useAuth();
  const { showToast } = useToast();

  const handleGoogle = async (credentialResponse) => {
    const credential = credentialResponse?.credential;
    if (!credential) { showToast("Google sign-in was cancelled", "error"); return; }
    const r = await loginWithGoogle(credential);
    if (r.success) {
      showToast("Signed in with Google! 👋");
      onClose();
    } else {
      showToast(r.error || "Google sign-in failed", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (tab === "login") {
      const r = await login(form.email, form.password);
      if (r.success) { showToast("Welcome back! 👋"); onClose(); }
      else showToast(r.error, "error");
    } else if (tab === "signup") {
      if (!form.name || !form.phone) return showToast("Please fill all fields", "error");
      const r = await register(form.name, form.email, form.password, form.phone);
      if (r.success) { showToast("Account created! 🎉"); onClose(); }
      else showToast(r.error, "error");
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return showToast("Enter your email", "error");
    setBusy(true);
    try {
      await authAPI.forgotPassword(forgotEmail);
      setForgotSent(true);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-yellow-500/50 outline-none text-sm transition-colors";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-dark-2 border border-white/10 rounded-2xl p-8 w-full max-w-sm">

        {tab !== "forgot" && (
          <div className="flex gap-2 mb-6 bg-white/4 rounded-xl p-1">
            {["login", "signup"].map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-display font-semibold capitalize transition-all
                  ${tab === t ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : "text-gray-400 hover:text-white"}`}>
                {t}
              </button>
            ))}
          </div>
        )}

        {/* ---- Forgot password view ---- */}
        {tab === "forgot" ? (
          <>
            <h3 className="font-display text-xl font-black mb-2">Reset password 🔑</h3>
            {forgotSent ? (
              <div className="text-sm text-gray-300 mt-4">
                <p className="mb-4">If that email is registered, a reset link is on its way. Check your inbox (and spam).</p>
                <button onClick={() => { setTab("login"); setForgotSent(false); }}
                  className="text-yellow-400 hover:underline text-sm">← Back to login</button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <p className="text-gray-400 text-xs">Enter your account email and we'll send a reset link.</p>
                <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                  className={inputClass} placeholder="you@example.com" required />
                <button type="submit" disabled={busy}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-300 text-black font-display font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-60">
                  {busy ? "Sending…" : "Send reset link"}
                </button>
                <button type="button" onClick={() => setTab("login")}
                  className="w-full text-gray-400 hover:text-white text-xs">← Back to login</button>
              </form>
            )}
          </>
        ) : (
          <>
            <h3 className="font-display text-xl font-black mb-6">
              {tab === "login" ? "Welcome back 👋" : "Create account ✨"}
            </h3>

            {/* Google sign-in */}
            <div className="flex justify-center mb-5">
              <GoogleLogin
                onSuccess={handleGoogle}
                onError={() => showToast("Google sign-in failed", "error")}
                theme="filled_black"
                shape="pill"
                text={tab === "login" ? "signin_with" : "signup_with"}
                width="300"
              />
            </div>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-white/10"></div>
              <span className="text-gray-500 text-xs">or</span>
              <div className="flex-1 h-px bg-white/10"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === "signup" && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Full Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputClass} placeholder="Rajeev Ranjan" required />
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass} placeholder="you@example.com" required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Password</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputClass} placeholder="••••••••" required minLength={6} />
              </div>
              {tab === "signup" && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={inputClass} placeholder="+91 98765 43210" required />
                </div>
              )}
              <button type="submit" disabled={authLoading}
                className={`w-full bg-gradient-to-r from-yellow-500 to-yellow-300 text-black font-display font-bold py-3 rounded-xl mt-2 transition-all ${authLoading ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"}`}>
                {authLoading ? "Please wait..." : tab === "login" ? "Login" : "Create Account"}
              </button>
            </form>

            {tab === "login" && (
              <p className="text-center text-xs mt-3">
                <span className="text-gray-400 cursor-pointer hover:text-yellow-400"
                  onClick={() => setTab("forgot")}>Forgot password?</span>
              </p>
            )}

            <p className="text-center text-xs text-gray-400 mt-4">
              {tab === "login" ? (
                <>No account? <span className="text-yellow-400 cursor-pointer hover:underline" onClick={() => setTab("signup")}>Sign up free</span></>
              ) : (
                <>Already registered? <span className="text-yellow-400 cursor-pointer hover:underline" onClick={() => setTab("login")}>Login</span></>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
