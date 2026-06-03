// ============================================================
// AdminPage.jsx — Complete Admin Dashboard
// Features: Stats, Bookings with filters, Slot management,
// Payments, Students, Analytics, CSV export, Email to student
// ============================================================
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { adminAPI } from "../utils/api";

const TABS = [
  { id: "overview", icon: "📊", label: "Overview" },
  { id: "bookings", icon: "📋", label: "Bookings" },
  { id: "slots", icon: "🕐", label: "Slots" },
  { id: "payments", icon: "💰", label: "Payments" },
  { id: "students", icon: "👥", label: "Students" },
  { id: "analytics", icon: "📈", label: "Analytics" },
  { id: "testimonials", icon: "⭐", label: "Reviews" },
];

const TIME_OPTIONS = [
  "06:00 AM","07:00 AM","08:00 AM","09:00 AM","10:00 AM","11:00 AM",
  "12:00 PM","01:00 PM","02:00 PM","03:00 PM","04:00 PM","05:00 PM",
  "06:00 PM","07:00 PM","08:00 PM","09:00 PM",
];

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const STATUS_COLORS = {
  confirmed: "bg-green-500/10 text-green-400 border-green-500/20",
  completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

export default function AdminPage({ setPage }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  // ---- Tab & Loading ----
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  // ---- Data ----
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [slots, setSlots] = useState([]);
  const [students, setStudents] = useState([]);

  // ---- Booking filters ----
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // ---- Slot management ----
  const [newSlotTime, setNewSlotTime] = useState("");
  const [newSlotDays, setNewSlotDays] = useState([...DAYS].filter(d => d !== "Sunday"));
  const [blockedDate, setBlockedDate] = useState("");

  // ---- Modals ----
  const [noteModal, setNoteModal] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [emailModal, setEmailModal] = useState(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // ---- Guard ----
  if (!user || user.role !== "admin") {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        <div className="text-6xl mb-6">🔒</div>
        <h2 className="font-display text-2xl font-black mb-3">Admin Access Only</h2>
        <p className="text-gray-400 text-sm mb-8">You need admin privileges to view this page.</p>
        <button onClick={() => setPage("home")}
          className="bg-gradient-to-r from-yellow-500 to-yellow-300 text-black font-display font-bold px-8 py-3 rounded-xl">
          Go to Home
        </button>
      </div>
    );
  }

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, b, p, sl, st] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getBookings(),
        adminAPI.getPayments(),
        adminAPI.getSlots(),
        adminAPI.getStudents(),
      ]);
      setStats(s.stats);
      setBookings(b.bookings);
      setPayments(p.payments);
      setSlots(sl.slots);
      setStudents(st.students);
    } catch (err) {
      showToast("Failed to load admin data", "error");
    } finally {
      setLoading(false);
    }
  };

  // ---- Booking actions ----
  const updateBookingStatus = async (id, status) => {
    try {
      await adminAPI.updateBooking(id, { status });
      showToast(`Booking marked as ${status}`);
      fetchAll();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const sendNote = async () => {
    if (!noteText.trim()) return;
    try {
      await adminAPI.sendNote(noteModal, noteText);
      showToast("Note saved!");
      setNoteModal(null);
      setNoteText("");
      fetchAll();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // ---- Email ----
  const sendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      showToast("Please fill subject and message", "error");
      return;
    }
    setSendingEmail(true);
    try {
      // This calls your backend email endpoint
      await adminAPI.sendNote(emailModal.bookingId, `EMAIL: ${emailSubject}\n\n${emailBody}`);
      showToast(`Email sent to ${emailModal.email}!`);
      setEmailModal(null);
      setEmailSubject("");
      setEmailBody("");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSendingEmail(false);
    }
  };

  // ---- Slot actions ----
  const addSlot = async () => {
    if (!newSlotTime) {
      showToast("Please select a time", "error");
      return;
    }
    if (newSlotDays.length === 0) {
      showToast("Please select at least one day", "error");
      return;
    }
    try {
      await adminAPI.addSlot(newSlotTime);
      showToast(`Slot ${newSlotTime} added!`);
      setNewSlotTime("");
      fetchAll();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const toggleSlot = async (id, current) => {
    try {
      await adminAPI.toggleSlot(id, !current);
      showToast(`Slot ${!current ? "enabled" : "disabled"}`);
      fetchAll();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const deleteSlot = async (id) => {
    if (!confirm("Remove this slot permanently?")) return;
    try {
      await adminAPI.deleteSlot(id);
      showToast("Slot removed");
      fetchAll();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const toggleDay = (day) => {
    setNewSlotDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // ---- CSV Export ----
  const exportCSV = () => {
    const headers = ["Student","Email","Phone","Package","Date","Time","Amount","Status"];
    const rows = filteredBookings.map(b => [
      b.user?.name || b.studentInfo?.name || "",
      b.user?.email || b.studentInfo?.email || "",
      b.user?.phone || b.studentInfo?.phone || "",
      b.packageName,
      b.date,
      b.timeSlot,
      `₹${b.packagePrice}`,
      b.status,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mentorshub-bookings-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exported!");
  };

  // ---- Filtered bookings ----
  const filteredBookings = bookings.filter(b => {
    const matchStatus = filterStatus === "all" || b.status === filterStatus;
    const matchDate = !filterDate || b.date === filterDate;
    const name = b.user?.name || b.studentInfo?.name || "";
    const email = b.user?.email || b.studentInfo?.email || "";
    const matchSearch = !filterSearch ||
      name.toLowerCase().includes(filterSearch.toLowerCase()) ||
      email.toLowerCase().includes(filterSearch.toLowerCase()) ||
      b.packageName.toLowerCase().includes(filterSearch.toLowerCase());
    return matchStatus && matchDate && matchSearch;
  });

  // ---- Analytics data ----
  const packageCounts = PACKAGES_LIST.map(pkg => ({
    name: pkg,
    count: bookings.filter(b => b.packageName === pkg).length,
    revenue: bookings.filter(b => b.packageName === pkg).reduce((s, b) => s + b.packagePrice, 0),
  })).filter(p => p.count > 0);

  const revenueByDay = {};
  bookings.forEach(b => {
    if (b.status !== "cancelled") {
      revenueByDay[b.date] = (revenueByDay[b.date] || 0) + b.packagePrice;
    }
  });
  const revenueData = Object.entries(revenueByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7);

  const maxRevenue = Math.max(...revenueData.map(([, v]) => v), 1);

  const inputClass = "bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-yellow-500/50 transition-colors";

  // ---- RENDER ----
  return (
    <div className="flex min-h-screen">

      {/* ---- Sidebar ---- */}
      <div className="w-56 bg-dark-2 border-r border-white/7 flex-shrink-0 hidden md:flex flex-col fixed h-full z-10">
        <div className="p-5 border-b border-white/7">
          <div className="font-display font-black text-sm text-yellow-400">ADMIN PANEL</div>
          <div className="text-xs text-gray-400 mt-1">MentorHub · {user.email.split("@")[0]}</div>
        </div>

        {/* Back to site */}
        <button
          onClick={() => setPage("home")}
          className="flex items-center gap-2 px-5 py-3 text-xs text-gray-400
            hover:text-white transition-all border-b border-white/7 hover:bg-white/3"
        >
          ← Back to Site
        </button>

        {/* Nav tabs */}
        <div className="flex-1 py-2 overflow-y-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm transition-all text-left
                ${tab === t.id
                  ? "border-l-2 border-yellow-400 text-yellow-400 bg-yellow-500/5"
                  : "text-gray-400 hover:text-white hover:bg-white/3"}`}
            >
              <span>{t.icon}</span>
              <span className="font-medium">{t.label}</span>
              {t.id === "bookings" && bookings.filter(b => b.status === "confirmed").length > 0 && (
                <span className="ml-auto bg-yellow-400 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {bookings.filter(b => b.status === "confirmed").length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-white/7">
          <div className="text-xs text-gray-500">MentorHub Admin v1.0</div>
        </div>
      </div>

      {/* ---- Mobile bottom tabs ---- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-dark-2 border-t border-white/7 z-40 flex">
        {TABS.slice(0, 5).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-xs flex flex-col items-center gap-1 transition-all
              ${tab === t.id ? "text-yellow-400" : "text-gray-400"}`}>
            <span className="text-base">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ---- Main Content ---- */}
      <div className="flex-1 md:ml-56 overflow-y-auto pb-20 md:pb-8">
        <div className="p-6 md:p-8 max-w-6xl mx-auto">

          {loading ? (
            <div className="text-center py-24 text-gray-400">
              <div className="text-5xl mb-4">⏳</div>
              <p>Loading admin data...</p>
            </div>
          ) : (
            <>

              {/* ============================================================
                  OVERVIEW
              ============================================================ */}
              {tab === "overview" && stats && (
                <div>
                  <h2 className="font-display text-2xl font-black mb-6">Overview</h2>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                      ["Total Bookings", stats.totalBookings, "text-yellow-400", "📋"],
                      ["Confirmed", stats.confirmed, "text-green-400", "✅"],
                      ["Completed", stats.completed, "text-blue-400", "🎯"],
                      ["Revenue", `₹${stats.totalRevenue.toLocaleString("en-IN")}`, "text-teal-400", "💰"],
                    ].map(([label, value, color, icon]) => (
                      <div key={label} className="bg-white/4 border border-white/7 rounded-2xl p-5 hover:border-white/12 transition-all">
                        <div className="text-2xl mb-2">{icon}</div>
                        <div className={`font-display text-2xl md:text-3xl font-black ${color}`}>{value}</div>
                        <div className="text-gray-400 text-sm mt-1">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Quick actions */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                    {[
                      ["📋 View Bookings", () => setTab("bookings"), "border-white/10"],
                      ["🕐 Manage Slots", () => setTab("slots"), "border-white/10"],
                      ["💰 Payments", () => setTab("payments"), "border-white/10"],
                      ["📈 Analytics", () => setTab("analytics"), "border-yellow-500/20 text-yellow-400"],
                    ].map(([label, action, border]) => (
                      <button key={label} onClick={action}
                        className={`border ${border} rounded-xl py-3 text-sm font-display font-semibold
                          hover:bg-white/4 transition-all text-center`}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Recent bookings table */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-bold text-lg">Recent Bookings</h3>
                    <button onClick={() => setTab("bookings")} className="text-yellow-400 text-xs hover:underline">
                      View all →
                    </button>
                  </div>
                  <BookingTable
                    bookings={bookings.slice(0, 5)}
                    onStatusUpdate={updateBookingStatus}
                    onNote={(id) => { setNoteModal(id); setNoteText(""); }}
                    onEmail={(b) => setEmailModal({ bookingId: b._id, email: b.user?.email || b.studentInfo?.email, name: b.user?.name || b.studentInfo?.name })}
                  />
                </div>
              )}

              {/* ============================================================
                  BOOKINGS
              ============================================================ */}
              {tab === "bookings" && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <h2 className="font-display text-2xl font-black">All Bookings</h2>
                    <button onClick={exportCSV}
                      className="bg-white/5 border border-white/10 text-white px-4 py-2 rounded-xl
                        text-sm font-display font-semibold hover:bg-white/8 transition-all flex items-center gap-2">
                      📥 Export CSV
                    </button>
                  </div>

                  {/* Filters */}
                  <div className="bg-white/3 border border-white/7 rounded-2xl p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Search */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5">Search</label>
                        <input
                          value={filterSearch}
                          onChange={(e) => setFilterSearch(e.target.value)}
                          placeholder="Name, email, package..."
                          className={`${inputClass} w-full`}
                        />
                      </div>
                      {/* Status filter */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5">Status</label>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                          className={`${inputClass} w-full`}>
                          <option value="all">All Status</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="pending">Pending</option>
                        </select>
                      </div>
                      {/* Date filter */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5">Date</label>
                        <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                          className={`${inputClass} w-full`} />
                      </div>
                    </div>
                    {/* Filter summary */}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-400">
                        Showing <span className="text-white font-medium">{filteredBookings.length}</span> of {bookings.length} bookings
                      </span>
                      {(filterStatus !== "all" || filterDate || filterSearch) && (
                        <button
                          onClick={() => { setFilterStatus("all"); setFilterDate(""); setFilterSearch(""); }}
                          className="text-xs text-yellow-400 hover:underline"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </div>

                  {filteredBookings.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <div className="text-4xl mb-3">🔍</div>
                      No bookings match your filters
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredBookings.map((b) => (
                        <BookingCard
                          key={b._id}
                          booking={b}
                          onStatusUpdate={updateBookingStatus}
                          onNote={(id, existing) => { setNoteModal(id); setNoteText(existing || ""); }}
                          onEmail={(b) => {
                            setEmailModal({
                              bookingId: b._id,
                              email: b.user?.email || b.studentInfo?.email,
                              name: b.user?.name || b.studentInfo?.name,
                            });
                            setEmailSubject("");
                            setEmailBody("");
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================
                  SLOTS
              ============================================================ */}
              {tab === "slots" && (
                <div>
                  <h2 className="font-display text-2xl font-black mb-6">Manage Slots</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Add new slot */}
                    <div className="bg-white/4 border border-white/7 rounded-2xl p-5">
                      <h3 className="font-display font-bold mb-4">➕ Add New Slot</h3>

                      <div className="mb-4">
                        <label className="block text-xs text-gray-400 mb-1.5">Select Time</label>
                        <select value={newSlotTime} onChange={(e) => setNewSlotTime(e.target.value)}
                          className={`${inputClass} w-full`}>
                          <option value="">Choose a time...</option>
                          {TIME_OPTIONS.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div className="mb-4">
                        <label className="block text-xs text-gray-400 mb-2">Available Days</label>
                        <div className="flex flex-wrap gap-2">
                          {DAYS.map((day) => (
                            <button
                              key={day}
                              onClick={() => toggleDay(day)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                                ${newSlotDays.includes(day)
                                  ? "bg-yellow-400 text-black border-yellow-400"
                                  : "border-white/10 text-gray-400 hover:border-white/25"}`}
                            >
                              {day.slice(0, 3)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button onClick={addSlot}
                        className="w-full bg-gradient-to-r from-yellow-500 to-yellow-300 text-black
                          font-display font-bold py-2.5 rounded-xl text-sm">
                        + Add Slot
                      </button>
                    </div>

                    {/* Block a date */}
                    <div className="bg-white/4 border border-white/7 rounded-2xl p-5">
                      <h3 className="font-display font-bold mb-4">🚫 Block a Date</h3>
                      <p className="text-gray-400 text-xs mb-4">
                        Block specific dates when you're unavailable — no slots will show for that day.
                      </p>
                      <div className="mb-4">
                        <label className="block text-xs text-gray-400 mb-1.5">Select Date to Block</label>
                        <input type="date" value={blockedDate} onChange={(e) => setBlockedDate(e.target.value)}
                          className={`${inputClass} w-full`} />
                      </div>
                      <button
                        onClick={() => {
                          if (!blockedDate) { showToast("Please select a date", "error"); return; }
                          showToast(`${blockedDate} blocked — students won't see slots for this day`);
                          setBlockedDate("");
                        }}
                        className="w-full border border-red-500/30 text-red-400 font-display font-bold
                          py-2.5 rounded-xl text-sm hover:bg-red-500/10 transition-all"
                      >
                        Block This Date
                      </button>
                      <p className="text-xs text-gray-500 mt-3">
                        💡 Coming soon: full blocked dates management
                      </p>
                    </div>
                  </div>

                  {/* Slots list */}
                  <h3 className="font-display font-bold mb-4">
                    Current Slots
                    <span className="ml-2 text-gray-400 font-normal text-sm">
                      ({slots.filter(s => s.isActive).length} active, {slots.filter(s => !s.isActive).length} disabled)
                    </span>
                  </h3>

                  {slots.length === 0 ? (
                    <div className="text-center py-12 bg-white/2 border border-white/7 rounded-2xl text-gray-400">
                      <div className="text-4xl mb-3">🕐</div>
                      <p className="mb-2">No slots added yet</p>
                      <p className="text-xs">Add your first slot above or run the seed script</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {slots.sort((a, b) => a.time.localeCompare(b.time)).map((s) => (
                        <div key={s._id}
                          className={`border rounded-xl p-4 transition-all
                            ${s.isActive
                              ? "bg-green-500/5 border-green-500/20"
                              : "bg-white/2 border-white/7 opacity-60"}`}>
                          <div className="font-display font-bold text-lg mb-0.5">{s.time}</div>
                          <div className={`text-xs mb-3 ${s.isActive ? "text-green-400" : "text-gray-500"}`}>
                            {s.isActive ? "● Active" : "○ Disabled"}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => toggleSlot(s._id, s.isActive)}
                              className="flex-1 text-xs border border-white/10 rounded-lg py-1.5
                                hover:border-white/25 transition-all text-gray-400 hover:text-white">
                              {s.isActive ? "Disable" : "Enable"}
                            </button>
                            <button onClick={() => deleteSlot(s._id)}
                              className="text-xs border border-red-500/20 text-red-400 rounded-lg
                                px-2.5 py-1.5 hover:bg-red-500/10 transition-all">
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================
                  PAYMENTS
              ============================================================ */}
              {tab === "payments" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display text-2xl font-black">Payment Records</h2>
                    <div className="text-sm text-gray-400">
                      Total: <span className="text-teal-400 font-bold">
                        ₹{payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount / 100, 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white/2 border border-white/7 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/7 bg-white/2">
                            {["Student","Package","Amount","Payment ID","Method","Status","Date"].map((h) => (
                              <th key={h} className="text-left px-4 py-3 text-xs text-gray-400
                                font-semibold font-display uppercase tracking-wide whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p) => (
                            <tr key={p._id} className="border-b border-white/4 hover:bg-white/2 transition-all">
                              <td className="px-4 py-3">
                                <div className="font-medium">{p.user?.name}</div>
                                <div className="text-xs text-gray-400">{p.user?.email}</div>
                              </td>
                              <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">
                                {p.booking?.packageName || "—"}
                              </td>
                              <td className="px-4 py-3 text-yellow-400 font-bold whitespace-nowrap">
                                ₹{(p.amount / 100).toLocaleString("en-IN")}
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-mono text-xs text-gray-400">
                                  {p.razorpayPaymentId
                                    ? p.razorpayPaymentId.slice(0, 18) + "..."
                                    : "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="bg-white/6 text-gray-300 text-xs px-2 py-1 rounded-md">
                                  {p.method || "UPI"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border
                                  ${p.status === "paid"
                                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                                    : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                {new Date(p.createdAt).toLocaleDateString("en-IN")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {payments.length === 0 && (
                      <div className="text-center py-12 text-gray-400">No payments yet</div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================
                  STUDENTS
              ============================================================ */}
              {tab === "students" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display text-2xl font-black">Students</h2>
                    <div className="text-sm text-gray-400">
                      <span className="text-white font-bold">{students.length}</span> registered
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {students.map((s) => {
                      const studentBookings = bookings.filter(
                        b => b.user?._id === s._id || b.user === s._id
                      );
                      return (
                        <div key={s._id} className="bg-white/4 border border-white/7 rounded-2xl p-5
                          hover:border-white/12 transition-all">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-yellow-500/20 text-yellow-400
                                font-display font-black flex items-center justify-center text-base flex-shrink-0">
                                {s.name[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="font-display font-bold">{s.name}</div>
                                <div className="text-xs text-gray-400">{s.email}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-500">Sessions</div>
                              <div className="font-display font-bold text-yellow-400">
                                {studentBookings.length}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-3">
                            <div>📱 {s.phone || "—"}</div>
                            <div>🎓 {s.college || "—"}</div>
                            <div>📅 {s.year || "—"}</div>
                            <div>🗓 {new Date(s.createdAt).toLocaleDateString("en-IN")}</div>
                          </div>

                          {s.skills && (
                            <div className="text-xs text-gray-500 mb-3">
                              💡 {s.skills}
                            </div>
                          )}

                          {studentBookings.length > 0 && (
                            <div className="pt-3 border-t border-white/6">
                              <div className="text-xs text-gray-400 mb-1">Latest booking:</div>
                              <div className="text-xs text-white">
                                {studentBookings[0].packageName} · {studentBookings[0].date}
                                <span className={`ml-2 px-1.5 py-0.5 rounded text-xs border ${STATUS_COLORS[studentBookings[0].status]}`}>
                                  {studentBookings[0].status}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {students.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <div className="text-4xl mb-3">👥</div>
                      No students registered yet
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================
                  ANALYTICS
              ============================================================ */}
              {tab === "analytics" && (
                <div>
                  <h2 className="font-display text-2xl font-black mb-6">Analytics</h2>

                  {/* Revenue chart */}
                  <div className="bg-white/4 border border-white/7 rounded-2xl p-6 mb-6">
                    <h3 className="font-display font-bold mb-1">Revenue — Last 7 Days</h3>
                    <p className="text-gray-400 text-xs mb-6">Daily revenue from confirmed bookings</p>
                    {revenueData.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        No revenue data yet
                      </div>
                    ) : (
                      <div className="flex items-end gap-3 h-40">
                        {revenueData.map(([date, amount]) => (
                          <div key={date} className="flex-1 flex flex-col items-center gap-2">
                            <div className="text-xs text-yellow-400 font-bold">₹{amount}</div>
                            <div
                              className="w-full bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t-lg transition-all"
                              style={{ height: `${(amount / maxRevenue) * 100}%`, minHeight: "4px" }}
                            />
                            <div className="text-xs text-gray-400 text-center">
                              {new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Package popularity */}
                  <div className="bg-white/4 border border-white/7 rounded-2xl p-6 mb-6">
                    <h3 className="font-display font-bold mb-1">Package Popularity</h3>
                    <p className="text-gray-400 text-xs mb-6">Bookings and revenue by package</p>
                    {packageCounts.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">No bookings yet</div>
                    ) : (
                      <div className="space-y-4">
                        {packageCounts.sort((a, b) => b.count - a.count).map((p) => (
                          <div key={p.name}>
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-sm font-medium">{p.name}</span>
                              <div className="text-right">
                                <span className="text-xs text-gray-400">{p.count} bookings · </span>
                                <span className="text-xs text-yellow-400 font-bold">
                                  ₹{p.revenue.toLocaleString("en-IN")}
                                </span>
                              </div>
                            </div>
                            <div className="h-2 bg-white/6 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-yellow-500 to-teal-400 rounded-full"
                                style={{ width: `${(p.count / bookings.length) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Summary stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      ["Avg Session Value", `₹${bookings.length ? Math.round(bookings.reduce((s, b) => s + b.packagePrice, 0) / bookings.length).toLocaleString("en-IN") : 0}`, "text-yellow-400"],
                      ["Completion Rate", `${bookings.length ? Math.round((bookings.filter(b => b.status === "completed").length / bookings.length) * 100) : 0}%`, "text-green-400"],
                      ["Cancellation Rate", `${bookings.length ? Math.round((bookings.filter(b => b.status === "cancelled").length / bookings.length) * 100) : 0}%`, "text-red-400"],
                      ["Total Students", students.length, "text-blue-400"],
                    ].map(([label, value, color]) => (
                      <div key={label} className="bg-white/4 border border-white/7 rounded-2xl p-4">
                        <div className={`font-display text-2xl font-black ${color} mb-1`}>{value}</div>
                        <div className="text-gray-400 text-xs">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

  {/* ============================================================
                  TESTIMONIALS
              ============================================================ */}
              {tab === "testimonials" && (
                <TestimonialsTab showToast={showToast} />
              )}

            </>
          )}
        </div>
      </div>

      {/* ---- Note Modal ---- */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setNoteModal(null)}>
          <div className="bg-dark-2 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-display font-bold text-lg mb-2">📝 Add Session Note</h3>
            <p className="text-gray-400 text-xs mb-4">
              This note will be saved to the booking record for your reference.
            </p>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              placeholder="Session summary, resources shared, next steps, feedback..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white
                text-sm outline-none focus:border-yellow-500/50 transition-colors resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setNoteModal(null)}
                className="flex-1 border border-white/10 py-2.5 rounded-xl text-sm font-display font-semibold">
                Cancel
              </button>
              <button onClick={sendNote}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-300 text-black
                  font-display font-bold py-2.5 rounded-xl text-sm">
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Email Modal ---- */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setEmailModal(null)}>
          <div className="bg-dark-2 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-display font-bold text-lg mb-1">📧 Email Student</h3>
            <p className="text-gray-400 text-xs mb-4">
              Sending to: <span className="text-white">{emailModal.name}</span> · {emailModal.email}
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Subject</label>
                <input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Session notes, resources, follow-up..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5
                    text-white text-sm outline-none focus:border-yellow-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Message</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={5}
                  placeholder="Write your message here..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                    text-white text-sm outline-none focus:border-yellow-500/50 transition-colors resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEmailModal(null)}
                className="flex-1 border border-white/10 py-2.5 rounded-xl text-sm font-display font-semibold">
                Cancel
              </button>
              <button onClick={sendEmail} disabled={sendingEmail}
                className={`flex-1 bg-gradient-to-r from-yellow-500 to-yellow-300 text-black
                  font-display font-bold py-2.5 rounded-xl text-sm
                  ${sendingEmail ? "opacity-60 cursor-not-allowed" : ""}`}>
                {sendingEmail ? "Sending..." : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Helper: packages list for analytics ----
const PACKAGES_LIST = [
  "Quick Guidance","Roadmap Session","Full Mentorship",
  "Resume Review","Interview Prep","Project Guidance",
];

// ---- Helper component: Booking Table (for overview) ----
function BookingTable({ bookings, onStatusUpdate, onNote, onEmail }) {
  if (bookings.length === 0) {
    return <div className="text-center py-8 text-gray-400 text-sm">No bookings yet</div>;
  }
  return (
    <div className="bg-white/2 border border-white/7 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/7 bg-white/2">
              {["Student","Package","Date","Time","Amount","Status","Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs text-gray-400
                  font-semibold font-display uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id} className="border-b border-white/4 hover:bg-white/2 transition-all">
                <td className="px-4 py-3">
                  <div className="font-medium whitespace-nowrap">
                    {b.user?.name || b.studentInfo?.name}
                  </div>
                  <div className="text-xs text-gray-400">{b.user?.email || b.studentInfo?.email}</div>
                </td>
                <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">{b.packageName}</td>
                <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">{b.date}</td>
                <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">{b.timeSlot}</td>
                <td className="px-4 py-3 text-yellow-400 font-bold whitespace-nowrap">₹{b.packagePrice}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${STATUS_COLORS[b.status]}`}>
                    {b.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {b.status === "confirmed" && (
                      <button onClick={() => onStatusUpdate(b._id, "completed")}
                        title="Mark completed"
                        className="w-7 h-7 rounded-lg bg-green-500/15 text-green-400 text-xs
                          hover:bg-green-500/25 transition-all flex items-center justify-center">
                        ✓
                      </button>
                    )}
                    <button onClick={() => onNote(b._id)}
                      title="Add note"
                      className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 text-xs
                        hover:bg-blue-500/25 transition-all flex items-center justify-center">
                      📝
                    </button>
                    <button onClick={() => onEmail(b)}
                      title="Email student"
                      className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 text-xs
                        hover:bg-purple-500/25 transition-all flex items-center justify-center">
                      ✉️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Helper component: Booking Card (for bookings tab) ----
function BookingCard({ booking: b, onStatusUpdate, onNote, onEmail }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white/4 border border-white/7 rounded-2xl overflow-hidden hover:border-white/12 transition-all">
      {/* Main row */}
      <div className="p-5">
        <div className="flex flex-wrap justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-400
                font-display font-bold text-sm flex items-center justify-center flex-shrink-0">
                {(b.user?.name || b.studentInfo?.name || "?")[0].toUpperCase()}
              </div>
              <div>
                <div className="font-display font-bold">
                  {b.user?.name || b.studentInfo?.name}
                </div>
                <div className="text-xs text-gray-400">
                  {b.user?.email || b.studentInfo?.email}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-gray-300">
              <span>📦 {b.packageName}</span>
              <span>📅 {b.date}</span>
              <span>⏰ {b.timeSlot}</span>
              <span className="text-yellow-400 font-bold">₹{b.packagePrice}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[b.status]}`}>
              {b.status}
            </span>
            <button onClick={() => setExpanded(!expanded)}
              className="text-xs text-gray-400 hover:text-white transition-colors">
              {expanded ? "▲ Less" : "▼ More"}
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {b.status === "confirmed" && (
            <>
              <button onClick={() => onStatusUpdate(b._id, "completed")}
                className="bg-green-500/15 border border-green-500/30 text-green-400
                  px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-500/25 transition-all">
                ✓ Mark Completed
              </button>
              <button onClick={() => onStatusUpdate(b._id, "cancelled")}
                className="bg-red-500/10 border border-red-500/20 text-red-400
                  px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-all">
                ✕ Cancel
              </button>
            </>
          )}
          <button onClick={() => onNote(b._id, b.adminNotes)}
            className="bg-blue-500/10 border border-blue-500/20 text-blue-400
              px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-all">
            📝 Note
          </button>
          <button onClick={() => onEmail(b)}
            className="bg-purple-500/10 border border-purple-500/20 text-purple-400
              px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-500/20 transition-all">
            ✉️ Email
          </button>
          {b.meetLink && (
            <a href={b.meetLink} target="_blank" rel="noreferrer"
              className="bg-teal-500/10 border border-teal-500/20 text-teal-400
                px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-teal-500/20 transition-all">
              📹 Meet
            </a>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-white/6 p-5 bg-white/2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-400 mb-1">Phone</div>
              <div>{b.user?.phone || b.studentInfo?.phone || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">College</div>
              <div>{b.studentInfo?.college || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Year</div>
              <div>{b.studentInfo?.year || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Skills</div>
              <div>{b.studentInfo?.skills || "—"}</div>
            </div>
            {b.studentInfo?.goals && (
              <div className="md:col-span-2">
                <div className="text-xs text-gray-400 mb-1">Goals</div>
                <div className="text-gray-300">{b.studentInfo.goals}</div>
              </div>
            )}
            {b.studentInfo?.questions && (
              <div className="md:col-span-2">
                <div className="text-xs text-gray-400 mb-1">Questions to Ask</div>
                <div className="text-gray-300">{b.studentInfo.questions}</div>
              </div>
            )}
            {b.adminNotes && (
              <div className="md:col-span-2">
                <div className="text-xs text-blue-400 mb-1">📝 Admin Notes</div>
                <div className="text-blue-300 bg-blue-500/5 border border-blue-500/15 rounded-lg p-3 text-xs">
                  {b.adminNotes}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs text-gray-400 mb-1">Booking ID</div>
              <div className="font-mono text-xs text-gray-400">{b._id}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Booked On</div>
              <div>{new Date(b.createdAt).toLocaleString("en-IN")}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ============================================================
// TestimonialsTab — Manage student reviews
// Approve pending, delete inappropriate ones
// ============================================================
function TestimonialsTab({ showToast }) {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const response = await fetch("/api/admin/testimonials", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("mentorToken")}`,
        },
      });
      const data = await response.json();
      setTestimonials(data.testimonials || []);
    } catch (err) {
      showToast("Failed to load reviews", "error");
    } finally {
      setLoading(false);
    }
  };

  const approve = async (id) => {
    try {
      await fetch(`/api/admin/testimonials/${id}/approve`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("mentorToken")}`,
        },
      });
      showToast("Review approved and published! ✅");
      fetchAll();
    } catch {
      showToast("Failed to approve", "error");
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this review permanently?")) return;
    try {
      await fetch(`/api/admin/testimonials/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("mentorToken")}`,
        },
      });
      showToast("Review deleted");
      fetchAll();
    } catch {
      showToast("Failed to delete", "error");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="text-4xl mb-3">⏳</div>
        Loading reviews...
      </div>
    );
  }

  const pending = testimonials.filter((t) => !t.approved);
  const approved = testimonials.filter((t) => t.approved);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl font-black">Student Reviews</h2>
        <div className="flex gap-3 text-sm">
          <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400
            px-3 py-1 rounded-full text-xs font-medium">
            ⏳ {pending.length} pending
          </span>
          <span className="bg-green-500/10 border border-green-500/20 text-green-400
            px-3 py-1 rounded-full text-xs font-medium">
            ✅ {approved.length} published
          </span>
        </div>
      </div>

      {/* ---- Pending reviews ---- */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
            Pending Approval
          </h3>
          <div className="space-y-4">
            {pending.map((t) => (
              <div key={t._id} className="bg-yellow-500/4 border border-yellow-500/15
                rounded-2xl p-5">
                <div className="flex justify-between items-start gap-4 mb-3 flex-wrap">
                  <div>
                    <div className="font-display font-bold">{t.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {t.email}
                      {t.college && ` · ${t.college}`}
                      {t.year && ` · ${t.year}`}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-yellow-400 text-sm">
                        {"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}
                      </span>
                      <span className="bg-white/6 text-gray-300 text-xs px-2 py-0.5 rounded-md">
                        {t.domain}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 flex-shrink-0">
                    {new Date(t.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric"
                    })}
                  </div>
                </div>

                <blockquote className="text-gray-300 text-sm italic leading-relaxed
                  border-l-2 border-yellow-500/30 pl-3 mb-4">
                  "{t.text}"
                </blockquote>

                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => approve(t._id)}
                    className="bg-green-500/15 border border-green-500/30 text-green-400
                      px-5 py-2 rounded-xl text-xs font-display font-bold
                      hover:bg-green-500/25 transition-all"
                  >
                    ✓ Approve & Publish
                  </button>
                  <button
                    onClick={() => remove(t._id)}
                    className="bg-red-500/8 border border-red-500/20 text-red-400
                      px-5 py-2 rounded-xl text-xs font-display font-bold
                      hover:bg-red-500/15 transition-all"
                  >
                    ✕ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- No pending ---- */}
      {pending.length === 0 && (
        <div className="mb-8 p-5 bg-green-500/4 border border-green-500/15 rounded-2xl
          text-center text-green-400 text-sm">
          ✅ No pending reviews — you're all caught up!
        </div>
      )}

      {/* ---- Published reviews ---- */}
      <div>
        <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400"></span>
          Published Reviews
        </h3>

        {approved.length === 0 ? (
          <div className="text-center py-10 bg-white/2 border border-white/7 rounded-2xl">
            <div className="text-4xl mb-3">⭐</div>
            <p className="text-gray-400 text-sm mb-2">No published reviews yet</p>
            <p className="text-gray-500 text-xs">
              Share this link with students who've had sessions with you:
            </p>
            <div className="mt-3 bg-white/4 border border-white/10 rounded-xl px-4 py-2
              inline-block text-xs text-yellow-400 font-mono">
              minicimextech.com/consultancy → "Share Your Experience" button
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {approved.map((t) => (
              <div key={t._id} className="bg-white/4 border border-white/7 rounded-xl p-4
                flex justify-between items-start gap-4 hover:border-white/12 transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <div className="w-7 h-7 rounded-full bg-yellow-500/20 text-yellow-400
                      font-display font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {t.name[0].toUpperCase()}
                    </div>
                    <span className="font-semibold text-sm">{t.name}</span>
                    <span className="text-yellow-400 text-xs">
                      {"★".repeat(t.rating)}
                    </span>
                    <span className="bg-white/6 text-gray-400 text-xs px-2 py-0.5 rounded-md">
                      {t.domain}
                    </span>
                  </div>
                  {t.college && (
                    <div className="text-xs text-gray-500 mb-1 ml-10">{t.college}</div>
                  )}
                  <p className="text-gray-400 text-xs italic ml-10 truncate">
                    "{t.text.slice(0, 120)}{t.text.length > 120 ? "..." : ""}"
                  </p>
                </div>
                <button
                  onClick={() => remove(t._id)}
                  className="text-red-400 text-xs hover:underline flex-shrink-0
                    opacity-60 hover:opacity-100 transition-all"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share tip */}
      <div className="mt-8 p-4 bg-blue-500/5 border border-blue-500/15 rounded-2xl">
        <div className="font-display font-bold text-sm text-blue-400 mb-2">
          💡 How to get more reviews
        </div>
        <div className="text-gray-400 text-xs leading-relaxed">
          After each session, send your student this message:
          <div className="mt-2 bg-white/4 border border-white/7 rounded-xl p-3
            font-mono text-xs text-gray-300">
            "If the session helped you, would you mind leaving a quick review?
            It helps other students decide. Here's the link:
            minicimextech.com/consultancy — scroll to 'Share Your Experience'"
          </div>
        </div>
      </div>
    </div>
  );
}