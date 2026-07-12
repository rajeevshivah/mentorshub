// ============================================================
// BookingPage.jsx — 4 step booking flow
// Step 1: Package → Step 2: Schedule → Step 3: Details → Step 4: Pay
// Slots fetched from database, calendar has month navigation
// ============================================================
import { useState, useEffect } from "react";
import { YEARS } from "../data/constants";
import { packageAPI } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { paymentAPI, bookingAPI, slotAPI } from "../utils/api";
import { loadRazorpay, openRazorpay } from "../utils/razorpay";
import PackageCard from "../components/PackageCard";

export default function BookingPage({ selectedPkgId, setPage }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  // ---- Booking state ----
  const [step, setStep] = useState(1);
  const [packages, setPackages] = useState([]);
  const [selectedPkg, setSelectedPkg] = useState(selectedPkgId || null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("upi");
const [upiTransactionId, setUpiTransactionId] = useState("");

  // ---- Calendar state ----
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const today = now.getDate();
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [viewYear, setViewYear] = useState(currentYear);

  // ---- Auto-fill from user profile ----
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    college: user?.college || "",
    year: user?.year || "",
    skills: user?.skills || "",
    goals: "",
    questions: "",
  });

  // ---- Fetch packages from API (replaces hardcoded PACKAGES) ----
  useEffect(() => {
    packageAPI.getActive("tech")
      .then((res) => setPackages(res.packages || []))
      .catch(() => setPackages([]));
  }, []);

  // ---- Fetch slots when date selected ----
  useEffect(() => {
    if (selectedDate) fetchSlots();
  }, [selectedDate, viewMonth, viewYear]);

  const fetchSlots = async () => {
    setSlotsLoading(true);
    try {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`;
      const data = await slotAPI.getAvailable(dateStr);
      setAvailableSlots(data.slots.map((s) => s.time));
    } catch (err) {
      // Fallback to default slots if API fails
      setAvailableSlots([
        "09:00 AM","10:00 AM","11:00 AM","12:00 PM",
        "02:00 PM","03:00 PM","04:00 PM","05:00 PM",
        "06:00 PM","07:00 PM",
      ]);
    } finally {
      setSlotsLoading(false);
    }
  };

  // ---- Calendar helpers ----
  const monthName = new Date(viewYear, viewMonth).toLocaleString("default", { month: "long" });

  const getDays = () => {
    const days = [];
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);
    return days;
  };

  const isPast = (d) => {
    if (viewYear > currentYear) return false;
    if (viewYear < currentYear) return true;
    if (viewMonth > currentMonth) return false;
    if (viewMonth < currentMonth) return true;
    return d < today;
  };

  const goToPrevMonth = () => {
    if (viewYear === currentYear && viewMonth === currentMonth) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
    setSelectedDate(null);
    setSelectedSlot(null);
    setAvailableSlots([]);
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
    setSelectedDate(null);
    setSelectedSlot(null);
    setAvailableSlots([]);
  };

  // ---- Payment handler ----
  const handlePayment = async () => {
    if (!user) {
      showToast("Please login first to book a session", "error");
      return;
    }
    setPayLoading(true);
    try {
      const order = await paymentAPI.createOrder(pkg._id);
      const loaded = await loadRazorpay();
      if (!loaded) {
        showToast("Failed to load payment gateway", "error");
        setPayLoading(false);
        return;
      }
      openRazorpay({
        order,
        pkg,
        user,
        form,
        onSuccess: async (response) => {
          try {
            await paymentAPI.verify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              paymentDbId: order.paymentId,
            });
            await bookingAPI.create({
              packageId: String(pkg._id),
              date: `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`,
              timeSlot: selectedSlot,
              studentInfo: form,
              paymentId: order.paymentId,
            });
            showToast("Payment successful! Check your email for Meet link 🎉");
            setPage("dashboard");
          } catch (err) {
            showToast(err.message || "Booking failed. Contact support.", "error");
          } finally {
            setPayLoading(false);
          }
        },
        onError: (msg) => {
          showToast(msg, "error");
          setPayLoading(false);
        },
      });
    } catch (err) {
      showToast(err.message || "Something went wrong", "error");
      setPayLoading(false);
    }
  };

  const pkg = packages.find((p) => p._id === selectedPkg) || packages[0] || {};
  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-yellow-500/50 outline-none text-sm transition-colors";
// ---- UPI booking handler ----
// const handleUpiBooking = async () => {
//   if (!user) {
//     showToast("Please login first", "error");
//     return;
//   }
//   if (!upiTransactionId.trim()) {
//     showToast("Please enter your UPI transaction ID", "error");
//     return;
//   }
//   setPayLoading(true);
//   try {
//     await bookingAPI.create({
//       packageId: String(pkg.id),
//       packageName: pkg.name,
//       packagePrice: pkg.price,
//       packageDuration: pkg.duration,
//       date: `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`,
//       timeSlot: selectedSlot,
//       studentInfo: form,
//       paymentMethod: "upi",
//       upiTransactionId: upiTransactionId.trim(),
//       meetLink: null,
//     });
//     showToast("Booking submitted! You'll get an email within 2 hours 🎉");
//     setPage("dashboard");
//   } catch (err) {
//     showToast(err.message || "Something went wrong", "error");
//   } finally {
//     setPayLoading(false);
//   }
// };
const handleUpiBooking = async () => {
  if (!user) {
    showToast("Please login first", "error");
    return;
  }
  if (!upiTransactionId.trim()) {
    showToast("Please enter your UPI transaction ID", "error");
    return;
  }
  setPayLoading(true);
  try {
    await bookingAPI.create({
      packageId: String(pkg._id),
      date: `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`,
      timeSlot: selectedSlot,
      studentInfo: form,
      paymentMethod: "upi",
      upiTransactionId: upiTransactionId.trim(),
    });
    showToast("Booking submitted! You'll get a confirmation email within 2 hours 🎉");
    // Small delay before navigation
    setTimeout(() => {
      setPayLoading(false);
      setPage("dashboard");
    }, 1000);
  } catch (err) {
    showToast(err.message || "Something went wrong", "error");
    setPayLoading(false);
  }
};
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">

      {/* Back button */}
      <button
        onClick={() => setPage("home")}
        className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-2 transition-colors"
      >
        ← Back to Home
      </button>

      <h1 className="font-display text-3xl font-black mb-2">Book Your Session</h1>
      <p className="text-gray-400 mb-8">Complete your booking in 4 simple steps</p>

      {/* ---- Step Indicators ---- */}
      <div className="flex gap-2 mb-4">
        {["Package", "Schedule", "Details", "Payment"].map((s, i) => (
          <div key={s} className="flex-1 text-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center
              text-sm font-bold font-display mx-auto mb-1 transition-all
              ${step > i + 1 ? "bg-green-500 text-black"
                : step === i + 1 ? "bg-yellow-400 text-black"
                : "bg-white/8 text-gray-400"}`}>
              {step > i + 1 ? "✓" : i + 1}
            </div>
            <div className="text-xs text-gray-400 hidden md:block">{s}</div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-white/6 rounded-full mb-10 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-yellow-500 to-teal-400 rounded-full transition-all duration-500"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {/* ============================================================
          STEP 1 — Choose Package
      ============================================================ */}
      {step === 1 && (
        <div>
          <h3 className="font-display font-bold text-lg mb-5">Choose Your Package</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((p) => (
              <PackageCard
                key={p._id}
                pkg={p}
                selectable={true}
                selected={selectedPkg === p._id}
                onBook={(id) => setSelectedPkg(id)}
              />
            ))}
          </div>
          <div className="flex justify-end mt-8">
            <button
              onClick={() => selectedPkg && setStep(2)}
              className={`bg-gradient-to-r from-yellow-500 to-yellow-300 text-black
                font-display font-bold px-8 py-3 rounded-xl transition-all
                ${!selectedPkg ? "opacity-40 cursor-not-allowed" : "hover:-translate-y-0.5"}`}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          STEP 2 — Schedule (Calendar + Slots)
      ============================================================ */}
      {step === 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Calendar */}
          <div>
            {/* Calendar header with navigation */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-lg">Pick a Date</h3>
                <p className="text-gray-400 text-xs mt-0.5">IST (India Standard Time)</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPrevMonth}
                  disabled={viewYear === currentYear && viewMonth === currentMonth}
                  className="w-8 h-8 rounded-lg border border-white/10 flex items-center
                    justify-center text-gray-400 hover:text-white hover:border-white/25
                    transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ←
                </button>
                <span className="font-display font-bold text-sm min-w-[120px] text-center">
                  {monthName} {viewYear}
                </span>
                <button
                  onClick={goToNextMonth}
                  className="w-8 h-8 rounded-lg border border-white/10 flex items-center
                    justify-center text-gray-400 hover:text-white hover:border-white/25
                    transition-all"
                >
                  →
                </button>
              </div>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1">
              {["S","M","T","W","T","F","S"].map((d, i) => (
                <div key={i} className="text-center text-xs text-gray-400 py-2 font-display font-semibold">
                  {d}
                </div>
              ))}

              {/* Days */}
              {getDays().map((d, i) => (
                <div
                  key={i}
                  onClick={() => d && !isPast(d) && setSelectedDate(d)}
                  className={`aspect-square flex items-center justify-center rounded-lg
                    text-sm font-display font-medium transition-all
                    ${!d ? ""
                      : isPast(d)
                        ? "text-gray-600 cursor-not-allowed opacity-40"
                        : selectedDate === d
                          ? "bg-yellow-400 text-black font-bold"
                          : "cursor-pointer hover:bg-yellow-500/15 hover:text-yellow-400"}`}
                >
                  {d}
                </div>
              ))}
            </div>
          </div>

          {/* Slots */}
          <div>
            <h3 className="font-display font-bold text-lg mb-1">Available Slots</h3>
            <p className="text-gray-400 text-xs mb-4">
              {selectedDate
                ? `${monthName} ${selectedDate}, ${viewYear}`
                : "Select a date first"}
            </p>

            <div className="grid grid-cols-2 gap-2">
              {!selectedDate ? (
                <p className="text-gray-500 text-sm col-span-2 py-6 text-center">
                  👈 Pick a date to see available slots
                </p>
              ) : slotsLoading ? (
                <p className="text-gray-400 text-sm col-span-2 py-6 text-center">
                  ⏳ Loading slots...
                </p>
              ) : availableSlots.length === 0 ? (
                <div className="col-span-2 py-6 text-center">
                  <p className="text-gray-400 text-sm mb-2">No slots available for this date</p>
                  <p className="text-gray-500 text-xs">Try a different date</p>
                </div>
              ) : (
                availableSlots.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSlot(s)}
                    className={`py-2.5 rounded-lg border text-sm font-display font-medium transition-all
                      ${selectedSlot === s
                        ? "bg-yellow-400 text-black border-yellow-400"
                        : "border-white/10 hover:border-yellow-500/50 hover:text-yellow-400"}`}
                  >
                    {s}
                  </button>
                ))
              )}
            </div>

            {/* Selected confirmation */}
            {selectedDate && selectedSlot && (
              <div className="mt-4 p-3 bg-teal-500/8 border border-teal-500/20 rounded-xl text-xs text-teal-400">
                ✓ {monthName} {selectedDate}, {viewYear} at {selectedSlot} IST
              </div>
            )}

            {/* Info box */}
            <div className="mt-4 p-3 bg-white/3 border border-white/7 rounded-xl text-xs text-gray-400">
              📹 Session via Google Meet · Link sent to your email after payment
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="md:col-span-2 flex gap-3 justify-end">
            <button
              onClick={() => setStep(1)}
              className="border border-white/10 px-6 py-2.5 rounded-xl font-display
                font-semibold hover:border-white/25 transition-all"
            >
              ← Back
            </button>
            <button
              onClick={() => selectedDate && selectedSlot && setStep(3)}
              className={`bg-gradient-to-r from-yellow-500 to-yellow-300 text-black
                font-display font-bold px-8 py-2.5 rounded-xl transition-all
                ${!selectedDate || !selectedSlot
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:-translate-y-0.5"}`}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          STEP 3 — Student Details
      ============================================================ */}
      {step === 3 && (
        <div>
          <h3 className="font-display font-bold text-lg mb-2">Tell me about yourself</h3>
          <p className="text-gray-400 text-sm mb-6">
            {user
              ? "✓ Some details auto-filled from your profile — update if needed"
              : "Please fill in your details"}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ["name", "Full Name *", "Rajeev Ranjan", "text"],
              ["email", "Email *", "you@email.com", "email"],
              ["phone", "Phone *", "+91 98765 43210", "tel"],
              ["college", "College / University", "VIT, DTU, NIT...", "text"],
            ].map(([key, label, ph, type]) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={ph}
                  className={inputClass}
                />
              </div>
            ))}

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Current Year</label>
              <select
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                className={inputClass}
              >
                <option value="">Select Year</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Current Skills</label>
              <input
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                placeholder="HTML, CSS, Python basics..."
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 mb-1.5">Your Goals *</label>
              <textarea
                value={form.goals}
                onChange={(e) => setForm({ ...form, goals: e.target.value })}
                rows={2}
                placeholder="e.g. Get a MERN stack job in 6 months, land a startup internship..."
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 mb-1.5">
                Questions to Ask (optional)
              </label>
              <textarea
                value={form.questions}
                onChange={(e) => setForm({ ...form, questions: e.target.value })}
                rows={2}
                placeholder="What specific questions do you have? The more detail, the better!"
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <button
              onClick={() => setStep(2)}
              className="border border-white/10 px-6 py-2.5 rounded-xl font-display
                font-semibold hover:border-white/25 transition-all"
            >
              ← Back
            </button>
            <button
              onClick={() => {
                if (!form.name || !form.email || !form.phone || !form.goals) {
                  showToast("Please fill all required fields (*)", "error");
                  return;
                }
                setStep(4);
              }}
              className="bg-gradient-to-r from-yellow-500 to-yellow-300 text-black
                font-display font-bold px-8 py-2.5 rounded-xl hover:-translate-y-0.5 transition-all"
            >
              Continue →
            </button>
          </div>
        </div>
      )}


      {/* ============================================================
          STEP 4 — Payment
      ============================================================ */}
      {step === 4 && (
        <div className="max-w-md mx-auto">
          <h3 className="font-display font-bold text-lg mb-6">Confirm & Pay</h3>

          {/* Booking Summary */}
          <div className="bg-white/4 border border-white/7 rounded-2xl p-6 mb-5">
            {[
              ["Package", `${pkg.icon} ${pkg.name}`],
              ["Duration", pkg.duration],
              ["Date", `${monthName} ${selectedDate}, ${viewYear}`],
              ["Time", `${selectedSlot} IST`],
              ["Name", form.name],
              ["Email", form.email],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-3 border-b border-white/6 text-sm last:border-0">
                <span className="text-gray-400">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
            <div className="flex justify-between pt-4 mt-2 border-t border-white/10">
              <span className="font-semibold">Total Amount</span>
              <span className="font-display text-2xl font-black text-yellow-400">
                ₹{pkg.price}
              </span>
            </div>
          </div>

          {/* ---- Payment Options ---- */}
          <div className="space-y-4 mb-4">

            {/* Option 1 — Razorpay (coming soon) */}
            <div className="relative border border-white/7 rounded-2xl p-5 opacity-50">
              {/* Coming soon overlay */}
              <div className="absolute top-3 right-3 bg-yellow-500/15 border border-yellow-500/30
                text-yellow-400 text-xs px-2 py-0.5 rounded-full font-medium">
                Coming Soon
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center
                  font-bold text-white text-xs flex-shrink-0">
                  R
                </div>
                <div>
                  <div className="font-semibold text-sm">Pay via Razorpay</div>
                  <div className="text-xs text-gray-400">Cards · Net Banking · EMI · Wallets</div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {["UPI", "Cards", "Net Banking", "EMI", "Wallets"].map((m) => (
                  <span key={m} className="bg-white/6 text-gray-400 text-xs px-2.5 py-1 rounded-md">
                    {m}
                  </span>
                ))}
              </div>
              <button
                disabled
                className="w-full mt-4 bg-white/10 text-gray-500 font-display font-bold
                  py-3 rounded-xl text-sm cursor-not-allowed"
              >
                Online Payment — Coming Soon
              </button>
            </div>

            {/* Option 2 — UPI Manual (active) */}
            <div className={`border rounded-2xl p-5 transition-all cursor-pointer
              ${paymentMethod === "upi"
                ? "border-yellow-500/40 bg-yellow-500/4"
                : "border-white/10 hover:border-white/20"}`}
              onClick={() => setPaymentMethod("upi")}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center
                    justify-center text-green-400 text-lg flex-shrink-0">
                    📱
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Pay via UPI</div>
                    <div className="text-xs text-green-400">✓ Available now · Confirmed within 2 hours</div>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                  paymentMethod === "upi"
                    ? "border-yellow-400 bg-yellow-400"
                    : "border-white/30"
                }`} />
              </div>

              {paymentMethod === "upi" && (
                <div className="mt-2">
                  {/* QR Code */}
                  <div className="text-center mb-4">
                    <p className="text-xs text-gray-400 mb-3">
                      Scan QR code with any UPI app
                    </p>
                    <div className="inline-block bg-white p-3 rounded-2xl">
                      <img
                        src="https://i.ibb.co/3ySRrMC6/Whats-App-Image-2026-06-09-at-12-22-51-AM.jpg"
                        alt="UPI QR Code"
                        className="w-48 h-48 object-contain rounded-lg"
                      />
                    </div>
                    <div className="mt-3 bg-white/5 border border-white/10 rounded-xl
                      px-4 py-2 inline-block">
                      <p className="text-xs text-gray-400">Amount to pay</p>
                      <p className="font-display font-black text-yellow-400 text-xl">
                        ₹{pkg.price}
                      </p>
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="bg-white/3 border border-white/7 rounded-xl p-4 mb-4">
                    <p className="text-xs font-display font-bold text-white mb-2">
                      How it works:
                    </p>
                    {[
                      "Scan QR and pay ₹" + pkg.price,
                      "Copy the transaction ID from your UPI app",
                      "Enter it below and submit",
                      "We'll confirm within 2 hours and send Meet link",
                    ].map((step, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1.5">
                        <span className="w-4 h-4 rounded-full bg-yellow-500/20 text-yellow-400
                          text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-xs text-gray-300">{step}</span>
                      </div>
                    ))}
                  </div>

                  {/* Transaction ID input */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">
                      UPI Transaction ID *
                    </label>
                    <input
                      value={upiTransactionId}
                      onChange={(e) => setUpiTransactionId(e.target.value)}
                      placeholder="e.g. 123456789012 or UPI ref number"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                        text-white placeholder-gray-500 focus:border-yellow-500/50 outline-none
                        text-sm transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Find this in your UPI app under transaction history
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Guarantee */}
          <div className="bg-green-500/6 border border-green-500/15 rounded-xl p-3 mb-4 text-xs text-green-400">
            ✓ 100% refund if session not confirmed or cancelled 24hrs before<br />
            ✓ Questions? Email <a href="mailto:rajeev@rajeevshivah.me"
              className="underline">rajeev@rajeevshivah.me</a>
          </div>

          {/* Login warning */}
          {!user && (
            <div className="bg-yellow-500/6 border border-yellow-500/20 rounded-xl p-3 mb-4
              text-xs text-yellow-400">
              ⚠️ Please login before completing your booking
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(3)}
              className="flex-1 border border-white/10 py-3 rounded-xl font-display
                font-semibold hover:border-white/25 transition-all"
            >
              ← Back
            </button>
            <button
              onClick={handleUpiBooking}
              disabled={payLoading || paymentMethod !== "upi" || !upiTransactionId.trim()}
              className={`flex-[2] bg-gradient-to-r from-yellow-500 to-yellow-300 text-black
                font-display font-bold py-3 rounded-xl transition-all
                ${payLoading || paymentMethod !== "upi" || !upiTransactionId.trim()
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:-translate-y-0.5"}`}
            >
              {payLoading ? "Submitting..." : "Submit Booking 🚀"}
            </button>
          </div>
          <p className="text-center text-xs text-gray-500 mt-3">
            Razorpay online payment coming soon
          </p>
        </div>
      )}
    </div>
  );
}