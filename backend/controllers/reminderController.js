// ============================================================
// reminderController.js  (Layer 2)
//
// Render free tier SLEEPS, so an in-process cron won't fire reliably.
// Instead this exposes a protected endpoint that an EXTERNAL cron
// (cron-job.org, free) hits every ~15 min. The hit both wakes the
// service and sends reminders for sessions starting within the window.
//
// Protected by a secret header so randoms can't trigger it.
// ============================================================
const Booking = require("../models/Booking");
const { sendReminder } = require("../utils/sendEmail");

// Parse "2026-06-30" + "09:00 AM" (IST) into a Date (UTC instant).
function parseSlotToDate(dateStr, slotStr) {
  // slotStr like "09:00 AM" / "02:00 PM"
  const m = slotStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = m[3].toUpperCase();
  if (mer === "PM" && hour !== 12) hour += 12;
  if (mer === "AM" && hour === 12) hour = 0;
  // Build an IST datetime, then convert to UTC by subtracting 5h30m.
  const [y, mo, d] = dateStr.split("-").map(Number);
  const istMs = Date.UTC(y, mo - 1, d, hour, min) - (5.5 * 60 * 60 * 1000);
  return new Date(istMs);
}

exports.runReminders = async (req, res) => {
  // Secret check
  const secret = req.headers["x-cron-secret"] || req.query.secret;
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    const now = Date.now();
    // Window: sessions starting between now and now+90min that haven't been reminded.
    const windowEnd = now + 90 * 60 * 1000;

    const candidates = await Booking.find({
      status: "confirmed",
      reminderSent: false,
    }).select("date timeSlot studentInfo packageName meetLink reminderSent");

    let sent = 0;
    for (const b of candidates) {
      const start = parseSlotToDate(b.date, b.timeSlot);
      if (!start) continue;
      const t = start.getTime();
      if (t >= now && t <= windowEnd) {
        if (b.studentInfo?.email) {
          try {
            await sendReminder(b.studentInfo.email, b);
            b.reminderSent = true;
            await b.save();
            sent++;
          } catch (e) {
            console.error("Reminder send failed:", e.message);
          }
        }
      }
    }

    res.json({ success: true, checked: candidates.length, sent });
  } catch (err) {
    console.error("Reminder run error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};
