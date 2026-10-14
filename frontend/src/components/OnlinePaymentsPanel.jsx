// ============================================================
// OnlinePaymentsPanel.jsx — Admin → Payments → Online (Razorpay)
// Every Razorpay order from MentorHub + talkWithShivah, with method,
// 🌍 for international cards, totals, and the tools to fix a
// "paid but slot taken" payment (rebook on a new slot, or mark
// resolved after refunding in the Razorpay dashboard).
// ============================================================
import { useState, useEffect, useCallback, useRef } from "react";
import { rzpAPI, slotAPI } from "../utils/api";

const FILTERS = [
  ["", "All"],
  ["paid", "Paid"],
  ["conflict", "⚠️ Needs attention"],
  ["created", "Not completed"],
  ["failed", "Failed"],
];

const fmtDate = (d) => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function StatusBadge({ p }) {
  let label = p.status, cls = "bg-white/6 text-gray-300 border-white/10";
  if (p.conflict && !p.conflictResolved) { label = "paid · slot taken"; cls = "bg-red-500/10 text-red-400 border-red-500/25"; }
  else if (p.conflict && p.conflictResolved) { label = "paid · resolved"; cls = "bg-blue-500/10 text-blue-300 border-blue-500/20"; }
  else if (p.status === "paid") { label = "paid"; cls = "bg-green-500/10 text-green-400 border-green-500/20"; }
  else if (p.status === "failed") { label = "failed"; cls = "bg-red-500/10 text-red-400 border-red-500/20"; }
  else if (p.status === "created") {
    const live = p.holdUntil && new Date(p.holdUntil) > new Date();
    label = live ? "in checkout" : "abandoned";
    cls = live ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-white/5 text-gray-500 border-white/10";
  }
  return <span className={`px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${cls}`}>{label}</span>;
}

function RebookForm({ payment, onDone, showToast }) {
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!date) { setSlots([]); return; }
    slotAPI.getAvailable(date)
      .then((d) => setSlots((d.slots || []).map((s) => s.time)))
      .catch(() => setSlots([]));
    setSlot("");
  }, [date]);

  const submit = async () => {
    if (!date || !slot) return showToast("Pick a date and time", "error");
    setBusy(true);
    try {
      await rzpAPI.rebook(payment._id, date, slot);
      showToast("Booked on the new slot. Student emailed ✅");
      onDone();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center mt-2">
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none" />
      <select value={slot} onChange={(e) => setSlot(e.target.value)} disabled={!date}
        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none">
        <option value="">{date ? (slots.length ? "Pick time" : "No free slots") : "Pick date first"}</option>
        {slots.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <button onClick={submit} disabled={busy}
        className="bg-green-500/15 border border-green-500/30 text-green-400 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-500/25 disabled:opacity-40">
        {busy ? "Booking…" : "Rebook"}
      </button>
    </div>
  );
}

export default function OnlinePaymentsPanel({ showToast, askConfirm, onChanged }) {
  const [filter, setFilter] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rebookFor, setRebookFor] = useState(null);
  // showToast changes identity on every render; keep it out of the deps
  const toastRef = useRef(showToast);
  toastRef.current = showToast;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await rzpAPI.adminPayments(filter));
    } catch (err) {
      toastRef.current("Couldn't load online payments: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const refresh = () => { setRebookFor(null); load(); onChanged?.(); };

  const markResolved = (p) => askConfirm({
    title: "Mark as resolved?",
    message: `Use this after you've refunded ${rupees(p.amount)} from the Razorpay dashboard (or sorted it out with the student another way). It won't refund anything by itself.`,
    confirmLabel: "Mark resolved",
    tone: "primary",
    onConfirm: async () => {
      try {
        await rzpAPI.resolve(p._id, "Refunded / handled manually");
        showToast("Marked resolved");
        refresh();
      } catch (err) {
        showToast(err.message, "error");
      }
    },
  });

  const copy = (text) => navigator.clipboard?.writeText(text).then(() => showToast("Copied")).catch(() => {});

  const payments = data?.payments || [];
  const totals = data?.totals || {};

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-2xl font-black">Online payments</h2>
          <div className="text-xs mt-1">
            {data?.enabled
              ? <span className="text-green-400">● Razorpay live</span>
              : <span className="text-gray-500">● Razorpay off (add the keys on Render to switch it on). Students see manual UPI only.</span>}
          </div>
        </div>
        <div className="text-sm text-gray-400 text-right">
          Collected online: <span className="text-teal-400 font-bold">{rupees(totals.paid)}</span>
          <span className="text-gray-500"> · {totals.paidCount || 0} payments</span>
          {totals.openConflicts > 0 && (
            <div className="text-red-400 text-xs mt-1">⚠️ {totals.openConflicts} need attention</div>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {FILTERS.map(([id, label]) => (
          <button key={id || "all"} onClick={() => setFilter(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
              ${filter === id ? "border-yellow-500/40 text-yellow-400 bg-yellow-500/5" : "border-white/10 text-gray-400 hover:text-white"}`}>
            {label}
          </button>
        ))}
        <button onClick={load} className="ml-auto px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-400 hover:text-white">
          ↻ Refresh
        </button>
      </div>

      <div className="bg-white/2 border border-white/7 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/7 bg-white/2">
                {["Date", "Student", "Package / slot", "Amount", "Method", "Status", "Payment ID"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-gray-400 font-semibold font-display uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const si = p.booking?.studentInfo || {};
                const needsFix = p.conflict && !p.conflictResolved;
                return (
                  <tr key={p._id} className={`border-b border-white/4 align-top ${needsFix ? "bg-red-500/5" : "hover:bg-white/2"}`}>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium whitespace-nowrap">{si.name || p.user?.name}</div>
                      <div className="text-xs text-gray-400">{si.email || p.user?.email}</div>
                      {si.phone && <div className="text-xs text-gray-500">{si.phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="text-gray-200 whitespace-nowrap">{p.brand === "meditation" ? "🧘 " : "💻 "}{p.packageName}</div>
                      <div className="text-gray-400 whitespace-nowrap">{p.booking?.date} · {p.booking?.timeSlot}</div>
                      {p.bookingRef && (
                        <div className="text-gray-500 mt-0.5">
                          Booking: {p.bookingRef.status}{p.bookingRef.meetLink ? " · link sent" : p.bookingRef.status === "confirmed" ? " · needs Meet link" : ""}
                        </div>
                      )}
                      {needsFix && (
                        <div className="mt-2">
                          <div className="text-red-400">Paid, but the slot was taken before the payment finished. No booking was created.</div>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <button onClick={() => setRebookFor(rebookFor === p._id ? null : p._id)}
                              className="bg-green-500/10 border border-green-500/25 text-green-400 px-2.5 py-1 rounded-lg text-xs hover:bg-green-500/20">
                              📅 Rebook on a new slot
                            </button>
                            <button onClick={() => markResolved(p)}
                              className="bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-lg text-xs hover:bg-white/10">
                              Refunded, mark resolved
                            </button>
                          </div>
                          {rebookFor === p._id && <RebookForm payment={p} onDone={refresh} showToast={showToast} />}
                        </div>
                      )}
                      {p.conflict && p.conflictResolved && p.conflictNote && (
                        <div className="text-blue-300 mt-1">{p.conflictNote}</div>
                      )}
                      {p.status === "failed" && p.failReason && <div className="text-red-400/80 mt-1">{p.failReason}</div>}
                    </td>
                    <td className="px-4 py-3 text-yellow-400 font-bold whitespace-nowrap">{rupees(p.amount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.method ? (
                        <span className="bg-white/6 text-gray-300 text-xs px-2 py-1 rounded-md">
                          {p.method}{p.international ? " 🌍" : ""}
                        </span>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge p={p} /></td>
                    <td className="px-4 py-3">
                      {p.paymentId ? (
                        <button onClick={() => copy(p.paymentId)} title="Copy (search it in Razorpay → Payments)"
                          className="font-mono text-xs text-gray-400 hover:text-white">{p.paymentId}</button>
                      ) : <span className="font-mono text-xs text-gray-600">{p.orderId}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && payments.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No online payments{filter ? " in this view" : " yet"}</div>
        )}
        {loading && <div className="text-center py-12 text-gray-500 text-sm">Loading…</div>}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        Refunds are done from the Razorpay dashboard (Transactions → Payments → search the payment ID → Refund).
        Manual UPI payments are verified from the Bookings tab as before.
      </p>
    </div>
  );
}
