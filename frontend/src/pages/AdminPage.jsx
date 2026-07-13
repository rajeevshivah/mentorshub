// ============================================================
// AdminPage.jsx — Complete Admin Dashboard
// ============================================================
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { adminAPI, testimonialAPI } from "../utils/api";
import PackagesTab from "../components/PackagesTab";
import RescheduleModal from "../components/RescheduleModal";
import NotificationBell from "../components/NotificationBell";
import ConfirmModal from "../components/ConfirmModal";

const TABS = [
  { id: "overview", icon: "📊", label: "Overview" },
  { id: "bookings", icon: "📋", label: "Bookings" },
  { id: "packages", icon: "📦", label: "Packages" },
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
  pending_upi: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const PACKAGES_LIST = [
  "Quick Guidance","Roadmap Session","Full Mentorship",
  "Resume Review","Interview Prep","Project Guidance",
];

export default function AdminPage({ setPage }) {
  const { user, bootstrapping } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [confirmState, setConfirmState] = useState(null);   // ConfirmModal

  // ---- Data ----
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [slots, setSlots] = useState([]);
  const [students, setStudents] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);

  // ---- Filters ----
  const [filterBrand, setFilterBrand] = useState("all");   // all | tech | meditation
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [bookingsPage, setBookingsPage] = useState(1);
  const BOOKINGS_PER_PAGE = 20;

  // ---- Slot management ----
  const [newSlotTime, setNewSlotTime] = useState("");
  const [newSlotDays, setNewSlotDays] = useState([...DAYS].filter(d => d !== "Sunday"));
  const [blockedDate, setBlockedDate] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockSlot, setBlockSlot] = useState("");   // "" = whole day
  const [vacationStart, setVacationStart] = useState("");
  const [vacationEnd, setVacationEnd] = useState("");
  const [vacationReason, setVacationReason] = useState("");
  const [cleanOptions, setCleanOptions] = useState({});

  // ---- Modals ----
  const [noteModal, setNoteModal] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [emailModal, setEmailModal] = useState(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [meetModal, setMeetModal] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [respondTarget, setRespondTarget] = useState(null);  // { booking, decision }
  const [respondText, setRespondText] = useState("");
  const [respondMeetLink, setRespondMeetLink] = useState("");   // optional new link on accept
  const [saveEmailAsNote, setSaveEmailAsNote] = useState(false); // email → session notes toggle
  const [meetLinkInput, setMeetLinkInput] = useState("");

  // ---- Data loading ----
  // IMPORTANT: no early returns above this point. The old code put the
  // admin guard between useState and useEffect, which broke React's
  // Rules of Hooks and white-screened the page whenever `user` changed
  // (e.g. right after login or session restore). All guards now live
  // AFTER every hook, further down.
  //
  // Also: waits for session restore (bootstrapping), silently refreshes
  // every 60s and on window focus so notifications and bookings stay
  // current without a manual reload.
  useEffect(() => {
    if (bootstrapping || !user || user.role !== "admin") return;
    fetchAll();
    const interval = setInterval(() => fetchAll(true), 60000);
    const onFocus = () => fetchAll(true);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrapping, user?.id]);

  // Jump back to page 1 whenever a booking filter changes.
  useEffect(() => { setBookingsPage(1); }, [filterStatus, filterDate, filterSearch, filterBrand]);

  // silent=true skips the full-page loader (used by background refresh)
  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [s, b, p, sl, st, bd] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getBookings(),
        adminAPI.getPayments(),
        adminAPI.getSlots(),
        adminAPI.getStudents(),
        adminAPI.getBlockedDates(),
      ]);
      setStats(s.stats);
      setBookings(b.bookings);
      setPayments(p.payments);
      setSlots(sl.slots);
      setStudents(st.students);
      setBlockedDates(bd.blockedDates);
    } catch (err) {
      if (!silent) showToast("Failed to load admin data", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // ---- Guards (safe here: every hook above has already run) ----
  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    );
  }
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

  // Asks for confirmation before cancelling / completing a booking.
  // Prevents accidental one-tap status changes (easy to mis-tap on mobile).
  const requestStatusUpdate = (id, status, studentName = "this student") => {
    const isCancel = status === "cancelled";
    setConfirmState({
      title: isCancel ? "Cancel this booking?" : "Mark session as completed?",
      message: isCancel
        ? `${studentName}'s booking will be cancelled and they will be notified by email. This cannot be undone.`
        : `${studentName}'s session will be marked completed. They will no longer be able to reschedule it.`,
      confirmLabel: isCancel ? "Yes, cancel booking" : "Yes, mark completed",
      tone: isCancel ? "danger" : "primary",
      onConfirm: () => updateBookingStatus(id, status),
    });
  };

  const handleAdminReschedule = async (date, timeSlot, _message, meetLink) => {
    await adminAPI.rescheduleBooking(rescheduleTarget._id, date, timeSlot, meetLink);
    showToast("Booking rescheduled, student notified");
    setRescheduleTarget(null);
    fetchAll();
  };

  const submitRescheduleResponse = async () => {
    try {
      await adminAPI.respondReschedule(
        respondTarget.booking._id, respondTarget.decision, respondText,
        respondTarget.decision === "accept" ? respondMeetLink : ""
      );
      showToast(respondTarget.decision === "accept" ? "Reschedule accepted" : "Reschedule rejected");
      setRespondTarget(null);
      setRespondText("");
      setRespondMeetLink("");
      fetchAll();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleAddResource = async (bookingId, title, url, type) => {
    try {
      await adminAPI.addResource(bookingId, title, url, type);
      showToast("Resource added");
      fetchAll();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleRemoveResource = async (bookingId, resourceId) => {
    try {
      await adminAPI.removeResource(bookingId, resourceId);
      showToast("Resource removed");
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

  const sendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      showToast("Please fill subject and message", "error");
      return;
    }
    setSendingEmail(true);
    try {
      await adminAPI.sendEmailToStudent(emailModal.bookingId, emailSubject, emailBody, saveEmailAsNote);
      showToast(`Email sent to ${emailModal.email}!`);
      setEmailModal(null);
      setEmailSubject("");
      setEmailBody("");
      setSaveEmailAsNote(false);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSendingEmail(false);
    }
  };

  // ---- Confirm UPI payment ----
const confirmUpiPayment = async () => {
  const link = meetLinkInput.trim() || "https://meet.google.com/mentorshub-session";
  try {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const response = await fetch(
      `${apiUrl}/bookings/${meetModal}/confirm-upi`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("mentorToken")}`,
        },
        body: JSON.stringify({ meetLink: link }),
      }
    );
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    showToast("Payment confirmed! Meet link sent to student ✅");
    setMeetModal(null);
    setMeetLinkInput("");
    // Force refresh data
    await fetchAll();
  } catch (err) {
    // If error says "not pending UPI" it means it already worked!
    if (err.message.includes("not pending UPI")) {
      showToast("Already confirmed! ✅");
      setMeetModal(null);
      setMeetLinkInput("");
      await fetchAll();
    } else {
      showToast(err.message || "Failed to confirm", "error");
    }
  }
};

  // ---- Slot actions ----
  const addSlot = async () => {
    if (!newSlotTime) { showToast("Please select a time", "error"); return; }
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

  const deleteSlot = (id, time) => {
    setConfirmState({
      title: "Remove this time slot?",
      message: `${time ? `The ${time} slot` : "This slot"} will be removed permanently. Existing bookings are not affected, but students can no longer book this time.`,
      confirmLabel: "Remove slot",
      tone: "danger",
      onConfirm: async () => {
        try {
          await adminAPI.deleteSlot(id);
          showToast("Slot removed");
          fetchAll();
        } catch (err) {
          showToast(err.message, "error");
        }
      },
    });
  };

  const toggleDay = (day) => {
    setNewSlotDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // ---- CSV Export ----
  // Every field is quoted (handles commas/quotes/newlines in names,
  // packages, addresses) and fields starting with = + - @ are prefixed
  // with ' to block Excel formula injection.
  const csvField = (v) => {
    let s = String(v ?? "");
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };

  const exportCSV = () => {
    const headers = ["Student","Email","Phone","Package","Date","Time","Amount","Status","Payment Method","Transaction ID"];
    const rows = filteredBookings.map(b => [
      b.user?.name || b.studentInfo?.name || "",
      b.user?.email || b.studentInfo?.email || "",
      b.user?.phone || b.studentInfo?.phone || "",
      b.packageName,
      b.date,
      b.timeSlot,
      `₹${b.packagePrice}`,
      b.status,
      b.paymentMethod || "razorpay",
      b.upiTransactionId || "—",
    ]);
    const csv = [headers, ...rows].map(r => r.map(csvField).join(",")).join("\n");
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
    // Old bookings have no brand field — they count as tech.
    const matchBrand =
      filterBrand === "all" ? true :
      filterBrand === "meditation" ? b.brand === "meditation" :
      b.brand !== "meditation";
    return matchStatus && matchDate && matchSearch && matchBrand;
  });

  // ---- Pagination (bookings tab) ----
  // Keeps the DOM light once bookings grow into the hundreds.
  const totalBookingPages = Math.max(1, Math.ceil(filteredBookings.length / BOOKINGS_PER_PAGE));
  const safeBookingsPage = Math.min(bookingsPage, totalBookingPages);
  const pagedBookings = filteredBookings.slice(
    (safeBookingsPage - 1) * BOOKINGS_PER_PAGE,
    safeBookingsPage * BOOKINGS_PER_PAGE
  );

  // ---- Analytics ----
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

  return (
    <div className="flex min-h-screen">

      {/* ---- Sidebar ---- */}
      <div className="w-56 bg-dark-2 border-r border-white/7 flex-shrink-0 hidden md:flex flex-col fixed h-full z-10">
        <div className="p-5 border-b border-white/7">
          <div className="font-display font-black text-sm text-yellow-400">ADMIN PANEL</div>
          <div className="text-xs text-gray-400 mt-1">MentorHub · {user.email.split("@")[0]}</div>
        </div>
        <button onClick={() => setPage("home")}
          className="flex items-center gap-2 px-5 py-3 text-xs text-gray-400
            hover:text-white transition-all border-b border-white/7 hover:bg-white/3">
          ← Back to Site
        </button>
        <div className="flex-1 py-2 overflow-y-auto">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm transition-all text-left
                ${tab === t.id
                  ? "border-l-2 border-yellow-400 text-yellow-400 bg-yellow-500/5"
                  : "text-gray-400 hover:text-white hover:bg-white/3"}`}>
              <span>{t.icon}</span>
              <span className="font-medium">{t.label}</span>
              {t.id === "bookings" && bookings.filter(b => b.status === "pending_upi").length > 0 && (
                <span className="ml-auto bg-orange-400 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {bookings.filter(b => b.status === "pending_upi").length}
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
        {/* Mobile-only top bar: brand + back to site */}
        <div className="md:hidden sticky top-0 z-30 bg-dark/90 backdrop-blur-xl border-b border-white/7 px-4 h-14 flex items-center justify-between">
          <div className="font-display font-black text-sm text-yellow-400">ADMIN PANEL</div>
          <button onClick={() => setPage("home")}
            className="text-xs text-gray-300 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 hover:bg-white/10">
            ← Back to Site
          </button>
        </div>
        <div className="p-6 md:p-8 max-w-6xl mx-auto">
          {/* Top bar with notifications */}
          <div className="flex justify-end mb-4">
            <NotificationBell storageKey="mh_notif_admin" items={(() => {
              const n = [];
              const pendingUpi = bookings.filter(b => b.status === "pending_upi");
              const reschedReqs = bookings.filter(b => b.rescheduleRequest?.status === "pending");
              reschedReqs.forEach(b => n.push({
                id: `rr-${b._id}`, icon: "🔄", tone: "warning",
                text: `${b.studentInfo?.name || "A student"} requested to reschedule ${b.packageName} → ${b.rescheduleRequest.requestedDate}, ${b.rescheduleRequest.requestedSlot}.`,
                onClick: () => setTab("bookings"),
              }));
              pendingUpi.forEach(b => n.push({
                id: `pu-${b._id}`, icon: "🕐", tone: "info",
                text: `${b.studentInfo?.name || "A student"}'s ${b.packageName} UPI payment awaits confirmation.`,
                onClick: () => setTab("bookings"),
              }));
              return n;
            })()} />
          </div>
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                      ["Total Bookings", stats.totalBookings, "text-yellow-400", "📋"],
                      ["Confirmed", stats.confirmed, "text-green-400", "✅"],
                      ["Completed", stats.completed, "text-blue-400", "🎯"],
                      ["Revenue", `₹${stats.totalRevenue.toLocaleString("en-IN")}`, "text-teal-400", "💰"],
                    ].map(([label, value, color, icon]) => (
                      <div key={label} className="bg-white/4 border border-white/7 rounded-2xl p-5">
                        <div className="text-2xl mb-2">{icon}</div>
                        <div className={`font-display text-2xl md:text-3xl font-black ${color}`}>{value}</div>
                        <div className="text-gray-400 text-sm mt-1">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Pending UPI alert */}
                  {bookings.filter(b => b.status === "pending_upi").length > 0 && (
                    <div className="bg-orange-500/8 border border-orange-500/25 rounded-2xl p-4 mb-6
                      flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                          <div className="font-display font-bold text-orange-400">
                            {bookings.filter(b => b.status === "pending_upi").length} UPI Payment{bookings.filter(b => b.status === "pending_upi").length > 1 ? "s" : ""} Pending
                          </div>
                          <div className="text-xs text-gray-400">
                            Verify and confirm these bookings
                          </div>
                        </div>
                      </div>
                      <button onClick={() => { setTab("bookings"); setFilterStatus("pending_upi"); }}
                        className="bg-orange-500/15 border border-orange-500/30 text-orange-400
                          px-4 py-2 rounded-xl text-xs font-display font-bold hover:bg-orange-500/25 transition-all">
                        Review Now →
                      </button>
                    </div>
                  )}

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

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-bold text-lg">Recent Bookings</h3>
                    <button onClick={() => setTab("bookings")} className="text-yellow-400 text-xs hover:underline">
                      View all →
                    </button>
                  </div>
                  <BookingTable
                    bookings={bookings.slice(0, 5)}
                    onStatusUpdate={requestStatusUpdate}
                    onNote={(id) => { setNoteModal(id); setNoteText(""); }}
                    onEmail={(b) => setEmailModal({
                      bookingId: b._id,
                      email: b.user?.email || b.studentInfo?.email,
                      name: b.user?.name || b.studentInfo?.name,
                    })}
                    onConfirmUpi={(id) => { setMeetModal(id); setMeetLinkInput(""); }}
                    onReschedule={(bk) => setRescheduleTarget(bk)}
                    onRespondReschedule={(bk, decision) => setRespondTarget({ booking: bk, decision })}
                    onAddResource={handleAddResource}
                    onRemoveResource={handleRemoveResource}
                  />
                </div>
              )}

              {/* ============================================================
                  BOOKINGS
              ============================================================ */}
              {tab === "bookings" && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4 flex-wrap">
                      <h2 className="font-display text-2xl font-black">All Bookings</h2>
                      {/* Brand toggle: which platform's bookings to show */}
                      <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
                        {[["all", "All"], ["tech", "💻 MentorHub"], ["meditation", "🧘 talkWithShivah"]].map(([val, label]) => (
                          <button key={val} onClick={() => setFilterBrand(val)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-display font-semibold transition-all
                              ${filterBrand === val
                                ? "bg-gradient-to-r from-yellow-500 to-yellow-300 text-black"
                                : "text-gray-400 hover:text-white"}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={exportCSV}
                      className="bg-white/5 border border-white/10 text-white px-4 py-2 rounded-xl
                        text-sm font-display font-semibold hover:bg-white/8 transition-all">
                      📥 Export CSV
                    </button>
                  </div>

                  <div className="bg-white/3 border border-white/7 rounded-2xl p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5">Search</label>
                        <input value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)}
                          placeholder="Name, email, package..."
                          className={`${inputClass} w-full`} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5">Status</label>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                          className={`${inputClass} w-full`}>
                          <option value="all">All Status</option>
                          <option value="pending_upi">⏳ Pending UPI</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="pending">Pending</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5">Date</label>
                        <input type="date" value={filterDate}
                          onChange={(e) => setFilterDate(e.target.value)}
                          className={`${inputClass} w-full`} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-400">
                        Showing <span className="text-white font-medium">{filteredBookings.length}</span> of {bookings.length} bookings
                      </span>
                      {(filterStatus !== "all" || filterDate || filterSearch) && (
                        <button onClick={() => { setFilterStatus("all"); setFilterDate(""); setFilterSearch(""); }}
                          className="text-xs text-yellow-400 hover:underline">
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
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                      {pagedBookings.map((b) => (
                        <BookingCard
                          key={b._id}
                          booking={b}
                          onStatusUpdate={requestStatusUpdate}
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
                          onConfirmUpi={(id) => { setMeetModal(id); setMeetLinkInput(""); }}
                    onReschedule={(bk) => setRescheduleTarget(bk)}
                    onRespondReschedule={(bk, decision) => setRespondTarget({ booking: bk, decision })}
                    onAddResource={handleAddResource}
                    onRemoveResource={handleRemoveResource}
                        />
                      ))}

                      {/* ---- Pager ---- */}
                      {totalBookingPages > 1 && (
                        <div className="flex items-center justify-center gap-3 pt-2 pb-1">
                          <button
                            onClick={() => setBookingsPage(p => Math.max(1, p - 1))}
                            disabled={safeBookingsPage === 1}
                            className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-gray-300
                              hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                            ← Prev
                          </button>
                          <span className="text-xs text-gray-400">
                            Page <span className="text-white font-medium">{safeBookingsPage}</span> of {totalBookingPages}
                          </span>
                          <button
                            onClick={() => setBookingsPage(p => Math.min(totalBookingPages, p + 1))}
                            disabled={safeBookingsPage === totalBookingPages}
                            className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-gray-300
                              hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                            Next →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================
                  SLOTS
              ============================================================ */}
              {tab === "slots" && (
                <div>
                  <h2 className="font-display text-2xl font-black mb-6">Manage Slots & Availability</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

                    {/* Add new slot */}
                    <div className="bg-white/4 border border-white/7 rounded-2xl p-5">
                      <h3 className="font-display font-bold mb-4">➕ Add Time Slot</h3>
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
                      <button onClick={addSlot}
                        className="w-full bg-gradient-to-r from-yellow-500 to-yellow-300 text-black
                          font-display font-bold py-2.5 rounded-xl text-sm">
                        + Add Slot
                      </button>
                      <p className="text-xs text-gray-500 mt-2">
                        Added slots are available every day unless blocked below
                      </p>
                    </div>

                    {/* Block single date */}
                    <div className="bg-white/4 border border-white/7 rounded-2xl p-5">
                      <h3 className="font-display font-bold mb-4">🚫 Block a Date</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1.5">Date</label>
                          <input type="date" value={blockedDate}
                            onChange={(e) => setBlockedDate(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                            className={`${inputClass} w-full`} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1.5">What to block</label>
                          <select value={blockSlot} onChange={(e) => setBlockSlot(e.target.value)}
                            className={`${inputClass} w-full`}>
                            <option value="">Whole day</option>
                            {slots.map((s) => (
                              <option key={s._id} value={s.time}>Only {s.time}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1.5">Reason (optional)</label>
                          <input placeholder="Holiday, Personal, etc."
                            value={blockReason} onChange={(e) => setBlockReason(e.target.value)}
                            className={`${inputClass} w-full`} />
                        </div>
                        <button
                          onClick={async () => {
                            if (!blockedDate) { showToast("Please select a date", "error"); return; }
                            try {
                              await adminAPI.blockDate(blockedDate, blockReason, blockSlot);
                              showToast(blockSlot
                                ? `${blockSlot} blocked on ${blockedDate}`
                                : `${blockedDate} blocked (whole day)`);
                              setBlockedDate(""); setBlockReason(""); setBlockSlot("");
                              fetchAll();
                            } catch (err) { showToast(err.message, "error"); }
                          }}
                          className="w-full border border-red-500/30 text-red-400 font-display font-bold
                            py-2.5 rounded-xl text-sm hover:bg-red-500/10 transition-all">
                          🚫 {blockSlot ? "Block This Slot" : "Block This Date"}
                        </button>
                      </div>
                    </div>

                    {/* Vacation mode */}
                    <div className="bg-white/4 border border-white/7 rounded-2xl p-5">
                      <h3 className="font-display font-bold mb-2">✈️ Vacation Mode</h3>
                      <p className="text-gray-400 text-xs mb-4">Block all slots for a date range at once.</p>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1.5">From</label>
                            <input type="date" value={vacationStart}
                              onChange={(e) => setVacationStart(e.target.value)}
                              min={new Date().toISOString().split("T")[0]}
                              className={`${inputClass} w-full`} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1.5">To</label>
                            <input type="date" value={vacationEnd}
                              onChange={(e) => setVacationEnd(e.target.value)}
                              min={vacationStart || new Date().toISOString().split("T")[0]}
                              className={`${inputClass} w-full`} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1.5">Reason</label>
                          <input placeholder="Vacation, Conference, etc."
                            value={vacationReason} onChange={(e) => setVacationReason(e.target.value)}
                            className={`${inputClass} w-full`} />
                        </div>
                        <button
                          onClick={async () => {
                            if (!vacationStart || !vacationEnd) {
                              showToast("Please select start and end dates", "error"); return;
                            }
                            try {
                              const result = await adminAPI.blockDateRange(vacationStart, vacationEnd, vacationReason || "Vacation");
                              showToast(`${result.dates?.length || 0} dates blocked! ✈️`);
                              setVacationStart(""); setVacationEnd(""); setVacationReason("");
                              fetchAll();
                            } catch (err) { showToast(err.message, "error"); }
                          }}
                          className="w-full bg-blue-500/15 border border-blue-500/30 text-blue-400
                            font-display font-bold py-2.5 rounded-xl text-sm hover:bg-blue-500/25 transition-all">
                          ✈️ Block Date Range
                        </button>
                      </div>
                    </div>

                    {/* Clean database */}
                    <div className="bg-red-500/4 border border-red-500/15 rounded-2xl p-5">
                      <h3 className="font-display font-bold mb-2 text-red-400">🗑️ Clean Database</h3>
                      <p className="text-gray-400 text-xs mb-4">Remove test data. Export CSV first!</p>
                      <div className="space-y-2 mb-4">
                        {[
                          ["deleteBookings", "Delete all bookings"],
                          ["deletePayments", "Delete all payments"],
                          ["deleteStudents", "Delete all student accounts"],
                        ].map(([key, label]) => (
                          <label key={key} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox"
                              checked={cleanOptions[key] || false}
                              onChange={(e) => setCleanOptions({...cleanOptions, [key]: e.target.checked})}
                              className="rounded" />
                            <span className="text-sm text-gray-300">{label}</span>
                          </label>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          if (!Object.values(cleanOptions).some(Boolean)) {
                            showToast("Select at least one option", "error"); return;
                          }
                          setConfirmState({
                            title: "Permanently delete selected data?",
                            message: "This wipes the selected records from the database. There is no undo and no backup.",
                            confirmLabel: "Delete permanently",
                            tone: "danger",
                            onConfirm: async () => {
                              try {
                                const result = await adminAPI.cleanDatabase(cleanOptions);
                                showToast(`Cleaned: ${JSON.stringify(result.deleted)}`);
                                setCleanOptions({});
                                fetchAll();
                              } catch (err) { showToast(err.message, "error"); }
                            },
                          });
                        }}
                        className="w-full bg-red-500/15 border border-red-500/30 text-red-400
                          font-display font-bold py-2.5 rounded-xl text-sm hover:bg-red-500/25 transition-all">
                        🗑️ Clean Selected Data
                      </button>
                    </div>
                  </div>

                  {/* Current slots */}
                  <h3 className="font-display font-bold mb-4">
                    Active Slots
                    <span className="ml-2 text-gray-400 font-normal text-sm">
                      ({slots.filter(s => s.isActive).length} active)
                    </span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
                    {slots.sort((a, b) => a.time.localeCompare(b.time)).map((s) => (
                      <div key={s._id}
                        className={`border rounded-xl p-3 transition-all text-center
                          ${s.isActive ? "bg-green-500/5 border-green-500/20" : "bg-white/2 border-white/7 opacity-50"}`}>
                        <div className="font-display font-bold">{s.time}</div>
                        <div className={`text-xs mt-1 mb-3 ${s.isActive ? "text-green-400" : "text-gray-500"}`}>
                          {s.isActive ? "● Active" : "○ Disabled"}
                        </div>
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => toggleSlot(s._id, s.isActive)}
                            className="flex-1 text-xs border border-white/10 rounded-lg py-1
                              hover:border-white/25 transition-all text-gray-400 hover:text-white">
                            {s.isActive ? "Off" : "On"}
                          </button>
                          <button onClick={() => deleteSlot(s._id, s.time)}
                            className="text-xs border border-red-500/20 text-red-400 rounded-lg
                              px-2 py-1 hover:bg-red-500/10 transition-all">
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Blocked dates */}
                  <h3 className="font-display font-bold mb-4">
                    Blocked Dates
                    <span className="ml-2 text-gray-400 font-normal text-sm">
                      ({blockedDates.length} blocked)
                    </span>
                  </h3>
                  {blockedDates.length === 0 ? (
                    <div className="text-center py-8 bg-white/2 border border-white/7 rounded-2xl text-gray-400 text-sm">
                      No blocked dates — all dates are available
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {blockedDates.map((b) => (
                        <div key={b._id} className="bg-red-500/5 border border-red-500/15 rounded-xl p-3">
                          <div className="font-display font-bold text-sm">
                            {new Date(b.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                          <div className="text-xs text-red-400 mt-1">
                            {b.allDay !== false ? "Full day" : "Specific slots"} · {b.reason}
                          </div>
                          {b.allDay === false && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {(b.blockedSlots || []).map((t) => (
                                <button key={t} title="Unblock this slot"
                                  onClick={async () => {
                                    try {
                                      await adminAPI.unblockDate(b._id, t);
                                      showToast(`${t} unblocked`);
                                      fetchAll();
                                    } catch (err) { showToast(err.message, "error"); }
                                  }}
                                  className="text-[11px] bg-white/5 border border-white/10 rounded-full
                                    px-2 py-0.5 text-gray-300 hover:border-red-400/50 hover:text-red-300 transition-all">
                                  {t} ✕
                                </button>
                              ))}
                            </div>
                          )}
                          <button onClick={async () => {
                            try {
                              await adminAPI.unblockDate(b._id);
                              showToast(b.allDay === false ? "All slots unblocked for this date" : "Date unblocked!");
                              fetchAll();
                            } catch (err) { showToast(err.message, "error"); }
                          }}
                            className="mt-2 w-full text-xs border border-white/10 text-gray-400
                              rounded-lg py-1 hover:border-white/25 hover:text-white transition-all">
                            {b.allDay === false ? "Unblock all" : "Unblock"}
                          </button>
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
                                font-semibold font-display uppercase tracking-wide whitespace-nowrap">{h}</th>
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
                              <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">{p.booking?.packageName || "—"}</td>
                              <td className="px-4 py-3 text-yellow-400 font-bold whitespace-nowrap">₹{(p.amount / 100).toLocaleString("en-IN")}</td>
                              <td className="px-4 py-3">
                                <span className="font-mono text-xs text-gray-400">
                                  {p.razorpayPaymentId ? p.razorpayPaymentId.slice(0, 18) + "..." : "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="bg-white/6 text-gray-300 text-xs px-2 py-1 rounded-md">{p.method || "UPI"}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border
                                  ${p.status === "paid" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
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
                    {payments.length === 0 && <div className="text-center py-12 text-gray-400">No payments yet</div>}
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
                      const studentBookings = bookings.filter(b => b.user?._id === s._id || b.user === s._id);
                      return (
                        <div key={s._id} className="bg-white/4 border border-white/7 rounded-2xl p-5 hover:border-white/12 transition-all">
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
                              <div className="font-display font-bold text-yellow-400">{studentBookings.length}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-3">
                            <div>📱 {s.phone || "—"}</div>
                            <div>🎓 {s.college || "—"}</div>
                            <div>📅 {s.year || "—"}</div>
                            <div>🗓 {new Date(s.createdAt).toLocaleDateString("en-IN")}</div>
                          </div>
                          {s.skills && <div className="text-xs text-gray-500 mb-3">💡 {s.skills}</div>}
                          {studentBookings.length > 0 && (
                            <div className="pt-3 border-t border-white/6">
                              <div className="text-xs text-gray-400 mb-1">Latest booking:</div>
                              <div className="text-xs text-white">
                                {studentBookings[0].packageName} · {studentBookings[0].date}
                                <span className={`ml-2 px-1.5 py-0.5 rounded text-xs border ${STATUS_COLORS[studentBookings[0].status] || ""}`}>
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
                      <div className="text-4xl mb-3">👥</div>No students registered yet
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
                  <div className="bg-white/4 border border-white/7 rounded-2xl p-6 mb-6">
                    <h3 className="font-display font-bold mb-1">Revenue — Last 7 Days</h3>
                    <p className="text-gray-400 text-xs mb-6">Daily revenue from confirmed bookings</p>
                    {revenueData.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">No revenue data yet</div>
                    ) : (
                      <div className="flex items-end gap-3 h-40">
                        {revenueData.map(([date, amount]) => (
                          <div key={date} className="flex-1 flex flex-col items-center gap-2">
                            <div className="text-xs text-yellow-400 font-bold">₹{amount}</div>
                            <div className="w-full bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t-lg"
                              style={{ height: `${(amount / maxRevenue) * 100}%`, minHeight: "4px" }} />
                            <div className="text-xs text-gray-400 text-center">
                              {new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                                <span className="text-xs text-yellow-400 font-bold">₹{p.revenue.toLocaleString("en-IN")}</span>
                              </div>
                            </div>
                            <div className="h-2 bg-white/6 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-yellow-500 to-teal-400 rounded-full"
                                style={{ width: `${(p.count / bookings.length) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
              {tab === "packages" && (
                <PackagesTab showToast={showToast} />
              )}

              {tab === "testimonials" && (
                <TestimonialsTab showToast={showToast} askConfirm={setConfirmState} />
              )}
            </>
          )}
        </div>
      </div>

      {/* ---- Note Modal ---- */}
      {respondTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setRespondTarget(null)}>
          <div className="bg-dark-2 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-display font-black text-lg mb-1">
              {respondTarget.decision === "accept" ? "Accept reschedule" : "Reject reschedule"}
            </h3>
            <p className="text-gray-400 text-xs mb-4">
              {respondTarget.booking.rescheduleRequest?.requestedDate} · {respondTarget.booking.rescheduleRequest?.requestedSlot}
              {respondTarget.decision === "accept" ? " — the booking will move to this slot." : " — the booking stays as-is."}
            </p>
            {respondTarget.decision === "accept" && (
              <div className="mb-4">
                <label className="text-xs text-gray-400 mb-1 block">New meeting link (optional)</label>
                <input type="url" value={respondMeetLink} onChange={(e) => setRespondMeetLink(e.target.value)}
                  placeholder="Leave empty to keep the current link"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-yellow-500/50" />
                {respondTarget.booking.meetLink && (
                  <p className="text-[11px] text-gray-500 mt-1 break-all">Current: {respondTarget.booking.meetLink}</p>
                )}
              </div>
            )}
            <label className="text-xs text-gray-400 mb-1 block">Response to student (optional)</label>
            <textarea rows={3} value={respondText} onChange={(e) => setRespondText(e.target.value)}
              placeholder={respondTarget.decision === "accept" ? "e.g. Sure, see you then!" : "e.g. That slot won't work, can you try Friday?"}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-yellow-500/50 mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRespondTarget(null)}
                className="px-4 py-2 rounded-xl border border-white/10 text-sm hover:bg-white/5">Cancel</button>
              <button onClick={submitRescheduleResponse}
                className={`px-4 py-2 rounded-xl font-display font-bold text-sm text-black
                  ${respondTarget.decision === "accept" ? "bg-green-400 hover:bg-green-300" : "bg-red-400 hover:bg-red-300"}`}>
                {respondTarget.decision === "accept" ? "Accept & move" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rescheduleTarget && (
        <RescheduleModal
          booking={rescheduleTarget}
          onConfirm={handleAdminReschedule}
          onClose={() => setRescheduleTarget(null)}
          showMeetLink={true}
        />
      )}

      {noteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setNoteModal(null)}>
          <div className="bg-dark-2 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-display font-bold text-lg mb-2">📝 Add Session Note</h3>
            <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)}
              rows={4} placeholder="Session summary, resources shared, next steps..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white
                text-sm outline-none focus:border-yellow-500/50 transition-colors resize-none mb-4" />
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
                <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Session notes, resources, follow-up..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5
                    text-white text-sm outline-none focus:border-yellow-500/50 transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Message</label>
                <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)}
                  rows={5} placeholder="Write your message here..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                    text-white text-sm outline-none focus:border-yellow-500/50 transition-colors resize-none" />
              </div>
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={saveEmailAsNote}
                  onChange={(e) => setSaveEmailAsNote(e.target.checked)}
                  className="rounded mt-0.5" />
                <span className="text-xs text-gray-400 leading-snug">
                  Also show this message in the student's dashboard as a session note.
                  Leave unchecked for logistics emails (links, payment, timing).
                </span>
              </label>
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

      {/* ---- Meet Link Modal (for UPI confirmation) ---- */}
      {meetModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setMeetModal(null)}>
          <div className="bg-dark-2 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-display font-bold text-lg mb-2">✓ Confirm UPI Payment</h3>
            <p className="text-gray-400 text-xs mb-4">
              Enter the meeting link. Student will receive email with this link instantly after confirmation.
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Google Meet or Zoom Link
                </label>
                <input
                  value={meetLinkInput}
                  onChange={(e) => setMeetLinkInput(e.target.value)}
                  placeholder="https://meet.google.com/xxx or https://zoom.us/j/xxx"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                    text-white text-sm outline-none focus:border-yellow-500/50 transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setMeetLinkInput("https://meet.google.com/")}
                  className="text-xs border border-white/10 px-3 py-1.5 rounded-lg
                    text-gray-400 hover:text-white hover:border-white/25 transition-all">
                  📹 Google Meet
                </button>
                <button onClick={() => setMeetLinkInput("https://zoom.us/j/")}
                  className="text-xs border border-white/10 px-3 py-1.5 rounded-lg
                    text-gray-400 hover:text-white hover:border-white/25 transition-all">
                  🎥 Zoom
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Leave empty to use default Meet link
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setMeetModal(null)}
                className="flex-1 border border-white/10 py-2.5 rounded-xl text-sm font-display font-semibold">
                Cancel
              </button>
              <button onClick={confirmUpiPayment}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-300 text-black
                  font-display font-bold py-2.5 rounded-xl text-sm">
                Confirm & Send Link ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Global confirmation dialog (replaces window.confirm) ---- */}
      <ConfirmModal state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}

// ---- Helper component: Booking Table (overview tab) ----
function BookingTable({ bookings, onStatusUpdate, onNote, onEmail, onConfirmUpi }) {
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
                  font-semibold font-display uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id} className="border-b border-white/4 hover:bg-white/2 transition-all">
                <td className="px-4 py-3">
                  <div className="font-medium whitespace-nowrap">{b.user?.name || b.studentInfo?.name}</div>
                  <div className="text-xs text-gray-400">{b.user?.email || b.studentInfo?.email}</div>
                </td>
                <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">
                  {b.brand === "meditation" ? "🧘 " : ""}{b.packageName}
                </td>
                <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">{b.date}</td>
                <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">{b.timeSlot}</td>
                <td className="px-4 py-3 text-yellow-400 font-bold whitespace-nowrap">₹{b.packagePrice}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${STATUS_COLORS[b.status] || ""}`}>
                    {b.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {b.status === "confirmed" && (
                      <button onClick={() => onStatusUpdate(b._id, "completed", b.user?.name || b.studentInfo?.name)} title="Mark completed"
                        className="w-7 h-7 rounded-lg bg-green-500/15 text-green-400 text-xs
                          hover:bg-green-500/25 transition-all flex items-center justify-center">✓</button>
                    )}
                    {b.status === "pending_upi" && (
                      <button onClick={() => onConfirmUpi(b._id)} title="Confirm UPI"
                        className="w-7 h-7 rounded-lg bg-orange-500/15 text-orange-400 text-xs
                          hover:bg-orange-500/25 transition-all flex items-center justify-center">💰</button>
                    )}
                    <button onClick={() => onNote(b._id)} title="Add note"
                      className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 text-xs
                        hover:bg-blue-500/25 transition-all flex items-center justify-center">📝</button>
                    <button onClick={() => onEmail(b)} title="Email student"
                      className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 text-xs
                        hover:bg-purple-500/25 transition-all flex items-center justify-center">✉️</button>
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

// ---- Helper component: Booking Card (bookings tab) ----
function BookingCard({ booking: b, onStatusUpdate, onNote, onEmail, onConfirmUpi, onReschedule, onRespondReschedule, onAddResource, onRemoveResource }) {
  const [expanded, setExpanded] = useState(false);
  const [resTitle, setResTitle] = useState("");
  const [resUrl, setResUrl] = useState("");

  return (
    <div className="bg-white/4 border border-white/7 rounded-2xl overflow-hidden hover:border-white/12 transition-all">
      <div className="p-5">
        <div className="flex flex-wrap justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-400
                font-display font-bold text-sm flex items-center justify-center flex-shrink-0">
                {(b.user?.name || b.studentInfo?.name || "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-display font-bold break-words">{b.user?.name || b.studentInfo?.name}</div>
                <div className="text-xs text-gray-400 break-all">{b.user?.email || b.studentInfo?.email}</div>
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
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[b.status] || ""}`}>
              {b.status}
            </span>
            <span className="text-[11px] text-gray-500">
              {b.brand === "meditation" ? "🧘 talkWithShivah" : "💻 MentorHub"}
            </span>
            <button onClick={() => setExpanded(!expanded)}
              className="text-xs text-gray-400 hover:text-white transition-colors">
              {expanded ? "▲ Less" : "▼ More"}
            </button>
          </div>
        </div>

        {/* Reschedule request awaiting admin decision */}
        {b.rescheduleRequest?.status === "pending" && (
          <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/25 rounded-xl">
            <div className="text-orange-300 text-xs font-bold mb-1">🔄 Reschedule requested</div>
            <div className="text-sm text-gray-200">
              {b.date} · {b.timeSlot} → <strong className="text-orange-300">{b.rescheduleRequest.requestedDate} · {b.rescheduleRequest.requestedSlot}</strong>
            </div>
            {b.rescheduleRequest.studentMessage && (
              <div className="text-xs text-gray-400 mt-2 italic">"{b.rescheduleRequest.studentMessage}"</div>
            )}
            <div className="flex gap-2 mt-3">
              <button onClick={() => onRespondReschedule(b, "accept")}
                className="bg-green-500/15 border border-green-500/30 text-green-400 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-500/25">
                ✓ Accept
              </button>
              <button onClick={() => onRespondReschedule(b, "reject")}
                className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-500/20">
                ✕ Reject
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {b.status === "confirmed" && (
            <>
              <button onClick={() => onStatusUpdate(b._id, "completed", b.user?.name || b.studentInfo?.name)}
                className="bg-green-500/15 border border-green-500/30 text-green-400
                  px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-500/25 transition-all">
                ✓ Mark Completed
              </button>
              <button onClick={() => onStatusUpdate(b._id, "cancelled", b.user?.name || b.studentInfo?.name)}
                className="bg-red-500/10 border border-red-500/20 text-red-400
                  px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-all">
                ✕ Cancel
              </button>
              <button onClick={() => onReschedule(b)}
                className="bg-orange-500/10 border border-orange-500/20 text-orange-400
                  px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-orange-500/20 transition-all">
                🔄 Reschedule
              </button>
            </>
          )}
          {/* FIX 2: Use onConfirmUpi prop instead of inline fetch */}
          {b.status === "pending_upi" && (
            <button onClick={() => onConfirmUpi(b._id)}
              className="bg-yellow-500/15 border border-yellow-500/30 text-yellow-400
                px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-yellow-500/25 transition-all">
              ✓ Confirm UPI Payment
            </button>
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
            ["completed", "cancelled"].includes(b.status) ? (
              <span className="bg-white/5 border border-white/10 text-gray-500
                px-3 py-1.5 rounded-lg text-xs font-medium cursor-not-allowed"
                title={`Session ${b.status}`}>
                📹 Meet (ended)
              </span>
            ) : (
              <a href={b.meetLink} target="_blank" rel="noreferrer"
                className="bg-teal-500/10 border border-teal-500/20 text-teal-400
                  px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-teal-500/20 transition-all">
                📹 Meet
              </a>
            )
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
            {b.upiTransactionId && (
              <div className="md:col-span-2">
                <div className="text-xs text-gray-400 mb-1">UPI Transaction ID</div>
                <div className="font-mono text-sm text-orange-400 bg-orange-500/5
                  border border-orange-500/15 rounded-lg px-3 py-2">
                  {b.upiTransactionId}
                </div>
              </div>
            )}
            {b.paymentMethod && (
              <div>
                <div className="text-xs text-gray-400 mb-1">Payment Method</div>
                <div className="text-sm">{b.paymentMethod === "upi" ? "📱 UPI" : "💳 Razorpay"}</div>
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

            {/* Shared resources (files/links to the student) */}
            <div className="md:col-span-2">
              <div className="text-xs text-teal-400 mb-2">📎 Shared Resources (student sees these)</div>
              {b.resources?.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {b.resources.map((r) => (
                    <div key={r._id} className="flex items-center justify-between bg-teal-500/5 border border-teal-500/15 rounded-lg px-3 py-2">
                      <a href={r.url} target="_blank" rel="noreferrer" className="text-teal-300 text-xs truncate hover:underline">
                        {r.type === "file" ? "📄" : "🔗"} {r.title || r.url}
                      </a>
                      <button onClick={() => onRemoveResource(b._id, r._id)}
                        className="text-red-400 text-xs ml-2 flex-shrink-0 hover:text-red-300">remove</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <input value={resTitle} onChange={(e) => setResTitle(e.target.value)}
                  placeholder="Title (e.g. Roadmap PDF)"
                  className="flex-1 min-w-[120px] bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-teal-500/50" />
                <input value={resUrl} onChange={(e) => setResUrl(e.target.value)}
                  placeholder="Paste link (Drive/Dropbox)"
                  className="flex-1 min-w-[160px] bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-teal-500/50" />
                <button onClick={() => { if (resUrl.trim()) { onAddResource(b._id, resTitle, resUrl, "link"); setResTitle(""); setResUrl(""); } }}
                  className="bg-teal-500/15 border border-teal-500/30 text-teal-400 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-teal-500/25">
                  + Add
                </button>
              </div>
              <p className="text-gray-500 text-[11px] mt-1">Paste a Google Drive / Dropbox link. (Direct file upload activates once Cloudinary is set up.)</p>
            </div>
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

// ---- Testimonials Tab ----
// FIX: previously used relative fetch("/api/admin/testimonials") which
// (a) hit a route that doesn't exist on the backend and (b) resolved to
// the FRONTEND domain in production, returning HTML instead of JSON.
// Now goes through testimonialAPI, which uses VITE_API_URL and the
// real routes (/testimonials/admin/all etc).
function TestimonialsTab({ showToast, askConfirm }) {
  const [testimonials, setTestimonials] = useState([]);
  const [brandTab, setBrandTab] = useState("all");   // all | tech | meditation
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const data = await testimonialAPI.getAll();
      setTestimonials(data.testimonials || []);
    } catch (err) {
      showToast("Failed to load reviews", "error");
    } finally {
      setLoading(false);
    }
  };

  const approve = async (id) => {
    try {
      await testimonialAPI.approve(id);
      showToast("Review approved and published! ✅");
      fetchAll();
    } catch { showToast("Failed to approve", "error"); }
  };

  const remove = (id, name) => {
    askConfirm({
      title: "Delete this review?",
      message: `${name ? `${name}'s review` : "This review"} will be removed permanently and unpublished from the site.`,
      confirmLabel: "Delete review",
      tone: "danger",
      onConfirm: async () => {
        try {
          await testimonialAPI.delete(id);
          showToast("Review deleted");
          fetchAll();
        } catch { showToast("Failed to delete", "error"); }
      },
    });
  };

  if (loading) return <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-3">⏳</div>Loading reviews...</div>;

  // Old reviews have no brand field — they count as tech.
  const byBrand = testimonials.filter((t) =>
    brandTab === "all" ? true :
    brandTab === "meditation" ? t.brand === "meditation" :
    t.brand !== "meditation"
  );
  const pending = byBrand.filter((t) => !t.approved);
  const approved = byBrand.filter((t) => t.approved);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl font-black">Student Reviews</h2>
        <div className="flex gap-3 text-sm">
          <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-medium">
            ⏳ {pending.length} pending
          </span>
          <span className="bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-medium">
            ✅ {approved.length} published
          </span>
        </div>
      </div>

      {/* Brand toggle: which platform's reviews to show */}
      <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 w-fit mb-6">
        {[["all", "All"], ["tech", "💻 MentorHub"], ["meditation", "🧘 talkWithShivah"]].map(([val, label]) => (
          <button key={val} onClick={() => setBrandTab(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-display font-semibold transition-all
              ${brandTab === val
                ? "bg-gradient-to-r from-yellow-500 to-yellow-300 text-black"
                : "text-gray-400 hover:text-white"}`}>
            {label}
          </button>
        ))}
      </div>

      {pending.length > 0 && (
        <div className="mb-8">
          <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
            Pending Approval
          </h3>
          <div className="space-y-4">
            {pending.map((t) => (
              <div key={t._id} className="bg-yellow-500/4 border border-yellow-500/15 rounded-2xl p-5">
                <div className="flex justify-between items-start gap-4 mb-3 flex-wrap">
                  <div>
                    <div className="font-display font-bold">
                      {t.name}
                      <span className="ml-2 text-[11px] text-gray-500 font-sans font-normal">
                        {t.brand === "meditation" ? "🧘 talkWithShivah" : "💻 MentorHub"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {t.email}{t.college && ` · ${t.college}`}{t.year && ` · ${t.year}`}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-yellow-400 text-sm">{"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}</span>
                      <span className="bg-white/6 text-gray-300 text-xs px-2 py-0.5 rounded-md">{t.domain}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 flex-shrink-0">
                    {new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
                <blockquote className="text-gray-300 text-sm italic leading-relaxed border-l-2 border-yellow-500/30 pl-3 mb-4">
                  "{t.text}"
                </blockquote>
                <div className="flex gap-3 flex-wrap">
                  <button onClick={() => approve(t._id)}
                    className="bg-green-500/15 border border-green-500/30 text-green-400
                      px-5 py-2 rounded-xl text-xs font-display font-bold hover:bg-green-500/25 transition-all">
                    ✓ Approve & Publish
                  </button>
                  <button onClick={() => remove(t._id, t.name)}
                    className="bg-red-500/8 border border-red-500/20 text-red-400
                      px-5 py-2 rounded-xl text-xs font-display font-bold hover:bg-red-500/15 transition-all">
                    ✕ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && (
        <div className="mb-8 p-5 bg-green-500/4 border border-green-500/15 rounded-2xl text-center text-green-400 text-sm">
          ✅ No pending reviews — you're all caught up!
        </div>
      )}

      <div>
        <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400"></span>
          Published Reviews
        </h3>
        {approved.length === 0 ? (
          <div className="text-center py-10 bg-white/2 border border-white/7 rounded-2xl">
            <div className="text-4xl mb-3">⭐</div>
            <p className="text-gray-400 text-sm mb-2">No published reviews yet</p>
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
                    <span className="text-yellow-400 text-xs">{"★".repeat(t.rating)}</span>
                    <span className="bg-white/6 text-gray-400 text-xs px-2 py-0.5 rounded-md">{t.domain}</span>
                    <span className="text-[11px] text-gray-500">
                      {t.brand === "meditation" ? "🧘 talkWithShivah" : "💻 MentorHub"}
                    </span>
                  </div>
                  {t.college && <div className="text-xs text-gray-500 mb-1 ml-10">{t.college}</div>}
                  <p className="text-gray-400 text-xs italic ml-10 truncate">
                    "{t.text.slice(0, 120)}{t.text.length > 120 ? "..." : ""}"
                  </p>
                </div>
                <button onClick={() => remove(t._id, t.name)}
                  className="text-red-400 text-xs hover:underline flex-shrink-0 opacity-60 hover:opacity-100 transition-all">
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-blue-500/5 border border-blue-500/15 rounded-2xl">
        <div className="font-display font-bold text-sm text-blue-400 mb-2">💡 How to get more reviews</div>
        <div className="text-gray-400 text-xs leading-relaxed">
          After each session, share this with your student:
          <div className="mt-2 bg-white/4 border border-white/7 rounded-xl p-3 font-mono text-xs text-gray-300">
            "Leave a quick review at mentorshub.rajeevshivah.me — scroll to 'Share Your Experience'"
          </div>
        </div>
      </div>
    </div>
  );
}