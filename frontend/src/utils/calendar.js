// ============================================================
// calendar.js — add-to-calendar helpers (Layer 2, no infra needed)
// Parses "2026-06-30" + "09:00 AM" (IST) into start/end and builds
// a Google Calendar link and a downloadable .ics file.
// ============================================================

function parseToUTC(dateStr, slotStr) {
  const m = slotStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = m[3].toUpperCase();
  if (mer === "PM" && hour !== 12) hour += 12;
  if (mer === "AM" && hour === 12) hour = 0;
  const [y, mo, d] = dateStr.split("-").map(Number);
  // IST -> UTC
  const startMs = Date.UTC(y, mo - 1, d, hour, min) - 5.5 * 60 * 60 * 1000;
  return new Date(startMs);
}

function durationMinutes(durationStr) {
  const m = String(durationStr || "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 30;
}

// Format Date -> "20260630T093000Z"
function fmt(dt) {
  return dt.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function googleCalendarUrl(booking) {
  const start = parseToUTC(booking.date, booking.timeSlot);
  if (!start) return null;
  const end = new Date(start.getTime() + durationMinutes(booking.packageDuration) * 60000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${booking.packageName} — MentorHub session`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `Your mentorship session.${booking.meetLink ? "\nJoin: " + booking.meetLink : ""}`,
    location: booking.meetLink || "Online",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcs(booking) {
  const start = parseToUTC(booking.date, booking.timeSlot);
  if (!start) return;
  const end = new Date(start.getTime() + durationMinutes(booking.packageDuration) * 60000);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MentorHub//EN",
    "BEGIN:VEVENT",
    `UID:${booking._id}@mentorshub`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${booking.packageName} — MentorHub session`,
    `DESCRIPTION:${booking.meetLink ? "Join: " + booking.meetLink : "Online session"}`,
    `LOCATION:${booking.meetLink || "Online"}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT60M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Session reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mentorhub-${booking.date}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
