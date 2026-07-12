// ============================================================
// ConfirmModal — themed replacement for window.confirm().
//
// Usage:
//   const [confirmState, setConfirmState] = useState(null);
//   setConfirmState({
//     title: "Cancel booking?",
//     message: "The student will be notified by email.",
//     confirmLabel: "Yes, cancel it",
//     tone: "danger",            // "danger" | "warning" | "primary"
//     onConfirm: () => doThing(),
//   });
//   ...
//   <ConfirmModal state={confirmState} onClose={() => setConfirmState(null)} />
//
// Enter confirms, Escape closes. Clicking the backdrop closes.
// ============================================================
import { useEffect } from "react";

const TONES = {
  danger: "bg-red-500 hover:bg-red-400 text-white",
  warning: "bg-orange-500 hover:bg-orange-400 text-black",
  primary: "bg-gradient-to-r from-yellow-500 to-yellow-300 hover:opacity-90 text-black",
};

export default function ConfirmModal({ state, onClose }) {
  useEffect(() => {
    if (!state) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter") { state.onConfirm?.(); onClose(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state, onClose]);

  if (!state) return null;

  const handleConfirm = () => {
    state.onConfirm?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-dark-2 border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display font-bold text-lg mb-2">
          {state.title || "Are you sure?"}
        </h3>
        {state.message && (
          <p className="text-gray-400 text-sm mb-6 break-words">{state.message}</p>
        )}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition-colors"
          >
            {state.cancelLabel || "Keep it"}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-display font-bold transition-all ${TONES[state.tone] || TONES.danger}`}
          >
            {state.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
