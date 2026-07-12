// ============================================================
// NotificationBell — derived notifications with read state.
//
// Items are computed by the parent from live data:
//   { id, icon, text, tone, onClick? }
//
// Read state is kept in localStorage under storageKey, so:
//  - the badge counts only UNREAD items
//  - opening the panel marks visible items as read (badge clears)
//  - individual items can be dismissed with the ✕ (hidden entirely)
//  - "Clear all" dismisses everything currently shown
// Because ids are stable (derived from booking ids + event type),
// read/dismissed state survives reloads but a genuinely new event
// (new id) always shows up unread.
// ============================================================
import { useState, useRef, useEffect } from "react";

function loadSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); }
  catch { return new Set(); }
}
function saveSet(key, set) {
  // Cap stored ids so localStorage doesn't grow forever.
  localStorage.setItem(key, JSON.stringify([...set].slice(-300)));
}

export default function NotificationBell({ items = [], align = "right", storageKey = "mh_notif" }) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState(() => loadSet(`${storageKey}_read`));
  const [dismissedIds, setDismissedIds] = useState(() => loadSet(`${storageKey}_dismissed`));
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const visible = items.filter((n) => !dismissedIds.has(n.id));
  const unreadCount = visible.filter((n) => !readIds.has(n.id)).length;

  const markAllRead = () => {
    const next = new Set(readIds);
    visible.forEach((n) => next.add(n.id));
    setReadIds(next);
    saveSet(`${storageKey}_read`, next);
  };

  const toggleOpen = () => {
    setOpen((o) => {
      const opening = !o;
      if (opening) markAllRead();
      return opening;
    });
  };

  const dismiss = (id) => {
    const next = new Set(dismissedIds);
    next.add(id);
    setDismissedIds(next);
    saveSet(`${storageKey}_dismissed`, next);
  };

  const clearAll = () => {
    const next = new Set(dismissedIds);
    visible.forEach((n) => next.add(n.id));
    setDismissedIds(next);
    saveSet(`${storageKey}_dismissed`, next);
  };

  const toneClasses = {
    warning: "text-orange-300",
    info: "text-blue-300",
    success: "text-green-300",
    danger: "text-red-300",
    default: "text-gray-300",
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggleOpen} aria-label="Notifications"
        className="relative w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center">
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-yellow-500 text-black text-[11px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute mt-2 w-80 max-w-[85vw] bg-dark-2 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden
          ${align === "right" ? "right-0" : "left-0"}`}>
          <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
            <span className="font-display font-bold text-sm">Notifications</span>
            {visible.length > 0 ? (
              <button onClick={clearAll} className="text-xs text-yellow-400 hover:underline">
                Clear all
              </button>
            ) : (
              <span className="text-xs text-gray-500">0 to review</span>
            )}
          </div>

          {visible.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              <div className="text-2xl mb-2">✨</div>
              You're all caught up.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {visible.map((n) => (
                <div key={n.id}
                  className="w-full px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors flex gap-3 items-start group">
                  <span className="text-base flex-shrink-0 mt-0.5">{n.icon}</span>
                  <button
                    onClick={() => { n.onClick?.(); setOpen(false); }}
                    className={`flex-1 text-left text-sm leading-snug break-words ${toneClasses[n.tone] || toneClasses.default}`}>
                    {n.text}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                    aria-label="Dismiss notification"
                    className="flex-shrink-0 text-gray-600 hover:text-gray-300 text-xs mt-0.5 px-1">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
