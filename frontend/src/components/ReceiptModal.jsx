// ============================================================
// ReceiptModal — clean on-screen receipt for a booking.
// Built from booking data (no backend needed).
// ============================================================
export default function ReceiptModal({ booking, user, onClose }) {
  const paidLabel = {
    razorpay: "Razorpay (Card/UPI/NetBanking)",
    upi: "UPI (manual)",
    manual: "Manual / Offline",
  }[booking.paymentMethod] || booking.paymentMethod;

  const statusColor =
    booking.status === "confirmed" || booking.status === "completed"
      ? "text-green-400" : booking.status === "cancelled"
      ? "text-red-400" : "text-yellow-400";

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-dark-2 border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="p-6 border-b border-white/8 flex items-center justify-between">
          <div>
            <div className="font-display font-black text-lg">Receipt</div>
            <div className="text-gray-500 text-xs mt-0.5">MentorHub · rajeevshivah.me</div>
          </div>
          <div className="text-2xl">🧾</div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Receipt for</span>
            <span className="font-medium">{user?.name || booking.studentInfo?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Email</span>
            <span>{user?.email || booking.studentInfo?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Booking ID</span>
            <span className="text-xs font-mono">{booking._id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Date issued</span>
            <span>{new Date(booking.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>

          <div className="border-t border-white/8 pt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Package</span>
              <span className="font-medium">{booking.icon} {booking.packageName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Duration</span>
              <span>{booking.packageDuration}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Session</span>
              <span>{booking.date} · {booking.timeSlot} IST</span>
            </div>
          </div>

          <div className="border-t border-white/8 pt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Payment method</span>
              <span>{paidLabel}</span>
            </div>
            {booking.upiTransactionId && (
              <div className="flex justify-between">
                <span className="text-gray-400">UPI txn</span>
                <span className="text-xs font-mono">{booking.upiTransactionId}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Status</span>
              <span className={`capitalize font-medium ${statusColor}`}>{booking.status}</span>
            </div>
          </div>

          <div className="border-t border-white/8 pt-4 flex justify-between items-center">
            <span className="font-display font-bold">Total paid</span>
            <span className="font-display font-black text-yellow-400 text-lg">₹{booking.packagePrice}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/8 flex gap-2 justify-end">
          <button onClick={() => window.print()}
            className="px-4 py-2 rounded-xl border border-white/10 text-sm hover:bg-white/5">
            🖨️ Print
          </button>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-300 text-black font-display font-bold text-sm hover:opacity-90">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
