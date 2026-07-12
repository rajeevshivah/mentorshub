// ============================================================
// Shared booking constants — single source of truth.
// FIXES the bug where slot-availability and conflict-checks
// used different status sets, allowing double-booking.
// ============================================================

// A slot is considered TAKEN if a booking holds it in any of these states.
// Used by BOTH the availability query and the create-booking conflict check.
const ACTIVE_BOOKING_STATUSES = ["confirmed", "pending", "pending_upi"];

// Rupees -> paise (centralized so the two old `amount * 100` spots can't drift)
const toPaise = (rupees) => Math.round(Number(rupees) * 100);

module.exports = { ACTIVE_BOOKING_STATUSES, toPaise };
