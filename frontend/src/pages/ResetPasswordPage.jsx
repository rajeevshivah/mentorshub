// ============================================================
// ResetPasswordPage — opened from the email link
//   /reset-password?token=...
// Your app navigates by page-state, so App.jsx detects the
// ?token= param on load and shows this page. (See setup guide.)
// ============================================================
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { authAPI } from "../utils/api";

export default function ResetPasswordPage({ token, setPage }) {
  const { setSession } = useAuth();
  const { showToast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (password.length < 6) return showToast("Password must be at least 6 characters", "error");
    if (password !== confirm) return showToast("Passwords don't match", "error");
    setLoading(true);
    try {
      const data = await authAPI.resetPassword(token, password);
      setSession(data.token, data.user); // auto-login
      setDone(true);
      showToast("Password reset! You're now logged in.");
      // clean the token out of the URL
      window.history.replaceState({}, "", "/");
      setTimeout(() => setPage("dashboard"), 1200);
    } catch (err) {
      showToast(err.message || "Reset failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-yellow-500/50 outline-none text-sm mb-3";

  return (
    <div className="max-w-md mx-auto px-6 py-24">
      <h2 className="font-display text-2xl font-black mb-2">Set a new password</h2>
      <p className="text-gray-400 text-sm mb-8">Choose a strong password you'll remember.</p>

      {done ? (
        <div className="text-green-400 text-sm">✓ Done. Redirecting…</div>
      ) : (
        <>
          <input type="password" placeholder="New password" value={password}
            onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          <input type="password" placeholder="Confirm new password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
          <button onClick={submit} disabled={loading}
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-300 text-black font-display font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 mt-2">
            {loading ? "Resetting…" : "Reset password"}
          </button>
        </>
      )}
    </div>
  );
}
