// ============================================================
// ToastContext — Global toast notifications
// Call showToast() from any component.
// Timer is kept in a ref so rapid consecutive toasts don't get
// dismissed early by a stale timeout.
// Positioned above the mobile bottom tab bar; normal corner on desktop.
// ============================================================
import { createContext, useContext, useState, useRef } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = (msg, type = "success") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ msg, type });
    timerRef.current = setTimeout(() => setToast(null), 3500);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className={`fixed bottom-24 right-4 md:bottom-6 md:right-6 px-5 py-3.5 rounded-xl border text-sm
          font-medium z-[70] flex items-center gap-2 shadow-xl transition-all max-w-[90vw]
          ${toast.type === "success"
            ? "bg-dark-2 border-green-500/30 text-green-400"
            : "bg-dark-2 border-red-500/30 text-red-400"}`}>
          {toast.type === "success" ? "✓" : "✕"} <span className="break-words">{toast.msg}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
