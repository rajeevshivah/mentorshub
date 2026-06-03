// ============================================================
// ToastContext — Global toast notifications
// Call showToast() from any component
// ============================================================
import { createContext, useContext, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3.5 rounded-xl border text-sm 
          font-medium z-50 flex items-center gap-2 shadow-xl transition-all
          ${toast.type === "success"
            ? "bg-dark-2 border-green-500/30 text-green-400"
            : "bg-dark-2 border-red-500/30 text-red-400"}`}>
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);