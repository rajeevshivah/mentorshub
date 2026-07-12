// ============================================================
// DashboardPage — tabbed student dashboard (responsive)
// Tabs: Overview · Bookings & Payments · Notes · Profile
// Sidebar on desktop, horizontal tabs on mobile.
// Add a future tab: add to TABS + a case in the content area.
// ============================================================
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { bookingAPI, authAPI } from "../utils/api";
import { googleCalendarUrl, downloadIcs } from "../utils/calendar";
import RescheduleModal from "../components/RescheduleModal";
import ReceiptModal from "../components/ReceiptModal";
import NotificationBell from "../components/NotificationBell";
import ConfirmModal from "../components/ConfirmModal";

const TABS = [
  { id: "overview", icon: "🏠", label: "Overview" },
  { id: "bookings", icon: "🧾", label: "Bookings & Payments" },
  { id: "notes", icon: "📝", label: "Session Notes" },
  { id: "profile", icon: "👤", label: "Profile" },
];

export default function DashboardPage({ setPage }) {
  const { user, bootstrapping } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState("overview");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rescheduling, setRescheduling] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  // Wait for session restore to finish, then fetch. Re-runs if the
  // logged-in user changes. Prevents the "everything zero until refresh"
  // race where the fetch fired before Google session restore completed.
  useEffect(() => {
    if (bootstrapping) return;      // session not resolved yet
    if (!user) { setLoading(false); return; }
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrapping, user?.id]);

  const fetchBookings = async () => {
    try {
      const data = await bookingAPI.getMyBookings();
      setBookings(data.bookings);
    } catch {
      showToast("Failed to load bookings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (id) => {
    setConfirmState({
      title: "Cancel this booking?",
      message: "Your session will be cancelled. If you paid already, refunds are handled personally by your mentor.",
      confirmLabel: "Yes, cancel it",
      cancelLabel: "Keep booking",
      tone: "danger",
      onConfirm: async () => {
        try {
          await bookingAPI.cancel(id, "Cancelled by student");
          showToast("Booking cancelled");
          fetchBookings();
        } catch (err) { showToast(err.message, "error"); }
      },
    });
  };

  const handleReschedule = async (date, timeSlot, message) => {
    try {
      await bookingAPI.reschedule(rescheduling._id, date, timeSlot, message);
      showToast("Reschedule request sent, awaiting approval");
      setRescheduling(null);
      fetchBookings();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  if (bootstrapping) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center text-gray-400 text-sm">
        Loading your dashboard…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        <div className="text-6xl mb-6">🔐</div>
        <h2 className="font-display text-2xl font-black mb-3">Login to view your dashboard</h2>
        <p className="text-gray-400 text-sm mb-8">Track sessions, manage your profile, and view receipts.</p>
        <button onClick={() => setPage("home")}
          className="bg-gradient-to-r from-yellow-500 to-yellow-300 text-black font-display font-bold px-8 py-3 rounded-xl">
          Go to Home
        </button>
      </div>
    );
  }

  const upcoming = bookings.filter((b) => b.status === "confirmed");
  const completed = bookings.filter((b) => b.status === "completed");

  // ---- Derived notifications (computed live from bookings) ----
  const notifications = [];
  bookings.forEach((b) => {
    const r = b.rescheduleRequest;
    if (r?.status === "pending") {
      notifications.push({ id: `resq-${b._id}`, icon: "⏳", tone: "warning",
        text: `Your reschedule request for ${b.packageName} (→ ${r.requestedDate}, ${r.requestedSlot}) is awaiting approval.`,
        onClick: () => setTab("overview") });
    }
    if (r?.status === "accepted" && r?.adminResponse) {
      notifications.push({ id: `resa-${b._id}`, icon: "✅", tone: "success",
        text: `Reschedule approved for ${b.packageName}. ${r.adminResponse ? `"${r.adminResponse}"` : ""}`,
        onClick: () => setTab("overview") });
    }
    if (r?.status === "rejected" && r?.adminResponse) {
      notifications.push({ id: `resr-${b._id}`, icon: "↩️", tone: "danger",
        text: `Reschedule declined for ${b.packageName}. "${r.adminResponse}"`,
        onClick: () => setTab("overview") });
    }
    if (b.status === "pending_upi") {
      notifications.push({ id: `upi-${b._id}`, icon: "🕐", tone: "info",
        text: `${b.packageName} booking is awaiting payment confirmation.`,
        onClick: () => setTab("bookings") });
    }
    if (b.sessionNotes) {
      notifications.push({ id: `note-${b._id}`, icon: "📝", tone: "info",
        text: `Your mentor shared notes for ${b.packageName}.`,
        onClick: () => setTab("notes") });
    }
  });

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center gap-4 mb-8">
        {user.avatar ? (
          <img src={user.avatar} alt="" className="w-12 h-12 rounded-full" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-yellow-500/20 text-yellow-400 font-display font-black text-lg flex items-center justify-center">
            {user.name[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h2 className="font-display text-2xl font-black">Hi, {user.name.split(" ")[0]}!</h2>
          <p className="text-gray-400 text-sm">{user.email}</p>
        </div>
        <NotificationBell storageKey="mh_notif_student" items={notifications} />
      </div>

      <div className="md:hidden flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${tab === t.id ? "bg-yellow-500 text-black" : "bg-white/5 text-gray-400"}`}>
            <span className="mr-1">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-8">
        <aside className="hidden md:block w-56 flex-shrink-0">
          <nav className="space-y-1 sticky top-24">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-3
                  ${tab === t.id ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20" : "text-gray-400 hover:bg-white/5"}`}>
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
            <button onClick={() => setPage("booking")}
              className="w-full mt-4 bg-gradient-to-r from-yellow-500 to-yellow-300 text-black font-display font-bold px-4 py-2.5 rounded-xl text-sm">
              + Book Session
            </button>
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          {tab === "overview" && (
            <OverviewTab upcoming={upcoming} completed={completed} bookings={bookings}
              loading={loading} setPage={setPage} onReschedule={setRescheduling} onCancel={handleCancel} />
          )}
          {tab === "bookings" && <BookingsTab bookings={bookings} loading={loading} onReceipt={setReceipt} />}
          {tab === "notes" && <NotesTab bookings={bookings} />}
          {tab === "profile" && <ProfileTab user={user} showToast={showToast} />}
        </main>
      </div>

      {rescheduling && (
        <RescheduleModal booking={rescheduling} onConfirm={handleReschedule} onClose={() => setRescheduling(null)} withMessage={true} />
      )}
      {receipt && <ReceiptModal booking={receipt} user={user} onClose={() => setReceipt(null)} />}

      <ConfirmModal state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}

function OverviewTab({ upcoming, completed, bookings, loading, setPage, onReschedule, onCancel }) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          ["Total", bookings.length, "text-yellow-400"],
          ["Upcoming", upcoming.length, "text-green-400"],
          ["Completed", completed.length, "text-blue-400"],
        ].map(([label, num, color]) => (
          <div key={label} className="bg-white/4 border border-white/7 rounded-2xl p-4">
            <div className={`font-display text-2xl md:text-3xl font-black ${color}`}>{num}</div>
            <div className="text-gray-400 text-xs md:text-sm mt-1">{label}</div>
          </div>
        ))}
      </div>

      <h3 className="font-display text-lg font-bold mb-4">Upcoming Sessions</h3>
      {loading ? (
        <div className="text-gray-400 text-sm py-8">Loading…</div>
      ) : upcoming.length === 0 ? (
        <div className="text-center py-12 bg-white/2 border border-white/7 rounded-2xl">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-gray-400 text-sm mb-5">No upcoming sessions.</p>
          <button onClick={() => setPage("booking")}
            className="bg-gradient-to-r from-yellow-500 to-yellow-300 text-black font-display font-bold px-6 py-2.5 rounded-xl text-sm">
            Book a Session
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {upcoming.map((b) => (
            <div key={b._id} className="bg-white/4 border border-white/7 rounded-2xl p-5">
              <div className="flex justify-between items-start flex-wrap gap-3">
                <div>
                  <div className="font-display font-bold">{b.packageName}</div>
                  <div className="text-gray-400 text-sm mt-1">📅 {b.date} · ⏰ {b.timeSlot} IST</div>
                </div>
                {b.meetLink && (
                  <a href={b.meetLink} target="_blank" rel="noreferrer"
                    className="bg-teal-500/15 border border-teal-500/30 text-teal-400 px-3 py-1.5 rounded-lg text-xs font-medium">
                    📹 Join Meet
                  </a>
                )}
              </div>

              {b.rescheduleRequest?.status === "pending" && (
                <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-xs">
                  <span className="text-orange-300 font-medium">⏳ Reschedule requested</span>
                  <span className="text-gray-400"> → {b.rescheduleRequest.requestedDate} · {b.rescheduleRequest.requestedSlot} (awaiting approval)</span>
                </div>
              )}
              {b.rescheduleRequest?.status === "rejected" && b.rescheduleRequest?.adminResponse && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs">
                  <span className="text-red-300 font-medium">Reschedule declined:</span>
                  <span className="text-gray-300"> "{b.rescheduleRequest.adminResponse}"</span>
                </div>
              )}
              {b.rescheduleRequest?.status === "accepted" && b.rescheduleRequest?.adminResponse && (
                <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-xs">
                  <span className="text-green-300 font-medium">✓ Reschedule approved:</span>
                  <span className="text-gray-300"> "{b.rescheduleRequest.adminResponse}"</span>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <a href={googleCalendarUrl(b)} target="_blank" rel="noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5">📆 Google Calendar</a>
                <button onClick={() => downloadIcs(b)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5">⬇ .ics</button>
                {b.rescheduleRequest?.status !== "pending" && (
                  <button onClick={() => onReschedule(b)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5">🔄 Reschedule</button>
                )}
                <button onClick={() => onCancel(b._id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10">Cancel</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BookingsTab({ bookings, loading, onReceipt }) {
  if (loading) return <div className="text-gray-400 text-sm py-8">Loading…</div>;
  if (bookings.length === 0) return <div className="text-gray-400 text-sm py-8">No bookings yet.</div>;
  return (
    <div>
      <h3 className="font-display text-lg font-bold mb-4">Bookings & Payments</h3>
      <div className="space-y-3">
        {bookings.map((b) => (
          <div key={b._id} className="bg-white/4 border border-white/7 rounded-2xl p-5 flex justify-between items-center flex-wrap gap-3">
            <div>
              <div className="font-display font-bold text-sm">{b.packageName}</div>
              <div className="text-gray-400 text-xs mt-1">{b.date} · {b.timeSlot} · <span className="capitalize">{b.paymentMethod}</span></div>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs
                ${b.status === "confirmed" || b.status === "completed" ? "bg-green-500/10 text-green-400"
                  : b.status === "cancelled" ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                {b.status}
              </span>
            </div>
            <div className="text-right">
              <div className="font-display font-black text-yellow-400">₹{b.packagePrice}</div>
              <button onClick={() => onReceipt(b)}
                className="mt-2 text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5">🧾 View Receipt</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotesTab({ bookings }) {
  const withContent = bookings.filter((b) => b.sessionNotes || (b.resources && b.resources.length));
  return (
    <div>
      <h3 className="font-display text-lg font-bold mb-4">Session Notes & Resources</h3>
      {withContent.length === 0 ? (
        <div className="text-center py-12 bg-white/2 border border-white/7 rounded-2xl">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-gray-400 text-sm">Notes and files your mentor shares after a session will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {withContent.map((b) => (
            <div key={b._id} className="bg-white/4 border border-white/7 rounded-2xl p-5">
              <div className="flex justify-between items-center mb-3">
                <div className="font-display font-bold text-sm">{b.packageName}</div>
                <div className="text-gray-500 text-xs">{b.date}</div>
              </div>
              {b.sessionNotes && (
                <div className="p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl mb-3">
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{b.sessionNotes}</p>
                </div>
              )}
              {b.resources?.length > 0 && (
                <div>
                  <div className="text-xs text-teal-400 mb-2">📎 Resources</div>
                  <div className="space-y-1.5">
                    {b.resources.map((r) => (
                      <a key={r._id} href={r.url} target="_blank" rel="noreferrer"
                        className="block bg-teal-500/5 border border-teal-500/15 rounded-lg px-3 py-2 text-teal-300 text-sm hover:bg-teal-500/10 transition-colors">
                        {r.type === "file" ? "📄" : "🔗"} {r.title || r.url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileTab({ user, showToast }) {
  const { setUser } = useAuth();
  const [form, setForm] = useState({
    name: user.name || "", phone: user.phone || "",
    college: user.college || "", year: user.year || "", skills: user.skills || "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) return showToast("Name can't be empty", "error");
    setSaving(true);
    try {
      const data = await authAPI.updateProfile(form);
      setUser((u) => ({ ...u, ...data.user }));
      showToast("Profile updated");
    } catch (err) {
      showToast(err.message || "Update failed", "error");
    } finally { setSaving(false); }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-yellow-500/50 mb-4";

  return (
    <div className="max-w-md">
      <h3 className="font-display text-lg font-bold mb-4">Your Profile</h3>
      {!user.phone && (
        <div className="mb-5 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-300 text-xs">
          Add your phone number so we can reach you about sessions.
        </div>
      )}
      <label className="text-xs text-gray-400 mb-1 block">Name</label>
      <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <label className="text-xs text-gray-400 mb-1 block">Email (can't change)</label>
      <input className={inputClass + " opacity-60"} value={user.email} disabled />
      <label className="text-xs text-gray-400 mb-1 block">Phone</label>
      <input className={inputClass} value={form.phone} placeholder="+91 98765 43210"
        onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <label className="text-xs text-gray-400 mb-1 block">College</label>
      <input className={inputClass} value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} />
      <label className="text-xs text-gray-400 mb-1 block">Year</label>
      <input className={inputClass} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
      <label className="text-xs text-gray-400 mb-1 block">Skills / Interests</label>
      <input className={inputClass} value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
      <button onClick={save} disabled={saving}
        className="bg-gradient-to-r from-yellow-500 to-yellow-300 text-black font-display font-bold px-6 py-2.5 rounded-xl text-sm hover:opacity-90 disabled:opacity-50">
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
