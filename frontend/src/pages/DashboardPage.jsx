// ============================================================
// DashboardPage — Student can view their bookings
// ============================================================
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { bookingAPI } from "../utils/api";

export default function DashboardPage({ setPage }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    try {
      const data = await bookingAPI.getMyBookings();
      setBookings(data.bookings);
    } catch (err) {
      showToast("Failed to load bookings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await bookingAPI.cancel(id, "Cancelled by student");
      showToast("Booking cancelled successfully");
      fetchBookings();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        <div className="text-6xl mb-6">🔐</div>
        <h2 className="font-display text-2xl font-black mb-3">Login to view your bookings</h2>
        <p className="text-gray-400 text-sm mb-8">Track sessions, join meetings, and manage your schedule.</p>
        <button
          onClick={() => setPage("home")}
          className="bg-gradient-to-r from-yellow-500 to-yellow-300 text-black font-display font-bold px-8 py-3 rounded-xl"
        >
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 rounded-full bg-yellow-500/20 text-yellow-400
          font-display font-black text-lg flex items-center justify-center">
          {user.name[0].toUpperCase()}
        </div>
        <div>
          <h2 className="font-display text-2xl font-black">
            Welcome back, {user.name.split(" ")[0]}!
          </h2>
          <p className="text-gray-400 text-sm">{user.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          ["Total Bookings", bookings.length, "text-yellow-400"],
          ["Confirmed", bookings.filter(b => b.status === "confirmed").length, "text-green-400"],
          ["Completed", bookings.filter(b => b.status === "completed").length, "text-blue-400"],
        ].map(([label, num, color]) => (
          <div key={label} className="bg-white/4 border border-white/7 rounded-2xl p-5">
            <div className={`font-display text-3xl font-black ${color}`}>{num}</div>
            <div className="text-gray-400 text-sm mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Bookings List */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold">Your Bookings</h3>
        <button
          onClick={() => setPage("booking")}
          className="bg-gradient-to-r from-yellow-500 to-yellow-300 text-black
            font-display font-bold px-4 py-2 rounded-lg text-sm"
        >
          + Book New Session
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading your bookings...</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 bg-white/2 border border-white/7 rounded-2xl">
          <div className="text-4xl mb-4">📅</div>
          <h3 className="font-display font-bold text-lg mb-2">No bookings yet</h3>
          <p className="text-gray-400 text-sm mb-6">Book your first session and start your journey!</p>
          <button
            onClick={() => setPage("booking")}
            className="bg-gradient-to-r from-yellow-500 to-yellow-300 text-black font-display font-bold px-6 py-2.5 rounded-xl"
          >
            Book a Session
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div key={b._id} className="bg-white/4 border border-white/7 rounded-2xl p-6 hover:border-white/12 transition-all">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <div className="font-display font-bold text-lg mb-1">{b.packageName}</div>
                  <div className="text-gray-400 text-sm">
                    📅 {b.date} · ⏰ {b.timeSlot} IST
                  </div>
                  <div className="text-gray-500 text-xs mt-1">Booking ID: {b._id}</div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium
                    ${b.status === "confirmed" ? "bg-green-500/10 text-green-400"
                      : b.status === "completed" ? "bg-blue-500/10 text-blue-400"
                      : b.status === "cancelled" ? "bg-red-500/10 text-red-400"
                      : "bg-yellow-500/10 text-yellow-400"}`}>
                    {b.status}
                  </span>
                  {b.meetLink && b.status === "confirmed" && (
                    <a
                      href={b.meetLink}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-teal-500/15 border border-teal-500/30 text-teal-400
                        px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-teal-500/25 transition-all"
                    >
                      📹 Join Meet
                    </a>
                  )}
                  {b.status === "confirmed" && (
                    <button
                      onClick={() => handleCancel(b._id)}
                      className="text-red-400 text-xs hover:underline"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/6 flex justify-between items-center">
                <span className="text-gray-400 text-sm">Amount Paid</span>
                <span className="font-display font-bold text-yellow-400">₹{b.packagePrice}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}