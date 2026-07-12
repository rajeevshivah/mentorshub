// ============================================================
// RescheduleModal — pick a new date + available slot.
// Used by both the student dashboard and the admin panel.
// Calls onConfirm(date, timeSlot).
// ============================================================
import { useState, useEffect } from "react";
import { slotAPI } from "../utils/api";

export default function RescheduleModal({ booking, onConfirm, onClose, withMessage = false }) {
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!date) { setSlots([]); return; }
    setLoading(true);
    setSlot("");
    slotAPI.getAvailable(date)
      .then((res) => setSlots(res.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [date]);

  const submit = async () => {
    setErr("");
    if (!date || !slot) { setErr("Pick a date and a slot"); return; }
    setSaving(true);
    try {
      await onConfirm(date, slot, message);
    } catch (e) {
      setErr(e.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-dark-2 border border-white/10 rounded-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-black text-lg mb-1">Reschedule session</h3>
        <p className="text-gray-400 text-xs mb-4">
          {booking.packageName} — currently {booking.date} · {booking.timeSlot}
        </p>

        <label className="text-xs text-gray-400 mb-1 block">New date</label>
        <input type="date" min={today} value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm w-full mb-4 outline-none focus:border-yellow-500/50" />

        {date && (
          <>
            <label className="text-xs text-gray-400 mb-2 block">Available slots</label>
            {loading ? (
              <div className="text-gray-400 text-sm py-3">Loading…</div>
            ) : slots.length === 0 ? (
              <div className="text-gray-400 text-sm py-3">No free slots that day.</div>
            ) : (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {slots.map((s) => (
                  <button key={s._id || s.time} onClick={() => setSlot(s.time)}
                    className={`py-2 rounded-lg text-xs border transition-all
                      ${slot === s.time ? "bg-yellow-500 text-black border-yellow-500 font-bold"
                        : "border-white/10 text-gray-300 hover:border-white/30"}`}>
                    {s.time}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {withMessage && (
          <div className="mb-3">
            <label className="text-xs text-gray-400 mb-1 block">Message (optional)</label>
            <textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Reason for rescheduling (helps get it approved faster)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-yellow-500/50" />
          </div>
        )}

        {err && <p className="text-red-400 text-xs mb-3">{err}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl border border-white/10 text-sm hover:bg-white/5">Cancel</button>
          <button onClick={submit} disabled={saving || !slot}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-300 text-black font-display font-bold text-sm hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
