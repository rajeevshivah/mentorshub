// ============================================================
// slotRules — shared availability rules used by BOTH the
// public availability endpoint and server-side booking checks,
// so the UI and the API can never disagree.
//
// Rule 1: full-day blocks hide every slot on that date.
// Rule 2: single-slot blocks hide just that date+time.
// Rule 3: same-day bookings need MIN_NOTICE_MINUTES of advance
//         notice, computed in IST explicitly (Render runs on UTC,
//         so using the server clock naively would be wrong by 5.5h).
// ============================================================
const BlockedDate = require("../models/BlockedDate");

const MIN_NOTICE_MINUTES = 120; // 2 hours

// Current date ("YYYY-MM-DD") and minutes-since-midnight in IST
function nowIST() {
  const ist = new Date(Date.now() + 330 * 60 * 1000); // UTC +5:30
  return {
    dateStr: ist.toISOString().slice(0, 10),
    minutes: ist.getUTCHours() * 60 + ist.getUTCMinutes(),
  };
}

// "8:00 PM" / "9:30 AM" → minutes since midnight; null if unparseable
function slotTimeToMinutes(timeStr) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((timeStr || "").trim());
  if (!m) return null;
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + parseInt(m[2], 10);
}

// True if this slot on this date is too soon (or already past)
function tooSoon(date, timeSlot) {
  const now = nowIST();
  if (date !== now.dateStr) return date < now.dateStr; // past dates too soon, future dates fine
  const mins = slotTimeToMinutes(timeSlot);
  if (mins === null) return false; // unparseable time: don't block, let older data through
  return mins < now.minutes + MIN_NOTICE_MINUTES;
}

// Full check for one date+slot. Returns null if bookable,
// or a human-readable reason string if not.
async function slotUnavailableReason(date, timeSlot) {
  const dayBlock = await BlockedDate.findOne({ date, allDay: true });
  if (dayBlock) return `Not available that day (${dayBlock.reason})`;

  const partial = await BlockedDate.findOne({ date, allDay: false });
  if (partial && (partial.blockedSlots || []).includes(timeSlot)) {
    return "That time is unavailable on this date";
  }

  if (tooSoon(date, timeSlot)) {
    return "Bookings need at least 2 hours notice — please pick a later time";
  }

  return null;
}

module.exports = { nowIST, slotTimeToMinutes, tooSoon, slotUnavailableReason, MIN_NOTICE_MINUTES };
