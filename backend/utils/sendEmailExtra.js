// ============================================================
// sendEmailExtra.js — additional emails for the overhaul.
// Reuses the same Brevo sender pattern as sendEmail.js.
// Kept separate so your existing sendEmail.js stays untouched.
// ============================================================
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const sendEmail = async (to, subject, htmlContent) => {
  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: "MentorHub by Rajeev Shivah", email: "rajeev@rajeevshivah.me" },
      to: [{ email: to }],
      subject,
      htmlContent,
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Brevo API error: ${response.status} ${errText}`);
  }
  console.log(`✅ Email sent to ${to}`);
};

const baseStyle = `font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0b0f1a;color:#e8eaf0;padding:40px;border-radius:16px`;
const detailBox = `background:#131929;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:24px;margin-bottom:24px`;

// ---- Reschedule notice ----
const sendRescheduleEmail = async (email, booking, from) => {
  await sendEmail(email, `🔄 Your session has been rescheduled`, `
    <div style="${baseStyle}">
      <h2 style="color:#f0a500;font-size:24px;margin-bottom:8px">Session rescheduled 🔄</h2>
      <p style="color:#7a8499;margin-bottom:24px">Hi ${booking.studentInfo.name}, your <strong>${booking.packageName}</strong> session has a new time.</p>
      <div style="${detailBox}">
        <p style="margin:0 0 12px"><span style="color:#7a8499">Previous:</span> <span style="text-decoration:line-through;color:#7a8499">${from.date} · ${from.slot} IST</span></p>
        <p style="margin:0"><span style="color:#7a8499">New time:</span> <strong style="color:#00d4aa">${booking.date} · ${booking.timeSlot} IST</strong></p>
      </div>
      ${booking.meetLink ? `
      <div style="text-align:center;margin-bottom:24px">
        <a href="${booking.meetLink}" style="background:#00d4aa;color:#0b0f1a;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Join Meeting →</a>
      </div>` : ""}
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:24px 0">
      <p style="color:#7a8499;font-size:12px;margin:0">MentorHub · rajeevshivah.me</p>
    </div>
  `);
};

// ---- Password reset ----
const sendPasswordResetEmail = async (email, name, resetUrl) => {
  await sendEmail(email, `🔑 Reset your MentorHub password`, `
    <div style="${baseStyle}">
      <h2 style="color:#f0a500;font-size:24px;margin-bottom:8px">Password reset request</h2>
      <p style="color:#7a8499;margin-bottom:24px">Hi ${name || "there"}, we received a request to reset your password. This link expires in 30 minutes.</p>
      <div style="text-align:center;margin-bottom:24px">
        <a href="${resetUrl}" style="background:#f0a500;color:#0b0f1a;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Reset Password →</a>
      </div>
      <p style="color:#7a8499;font-size:13px">If you didn't request this, you can safely ignore this email — your password won't change.</p>
      <p style="color:#7a8499;font-size:11px;word-break:break-all;margin-top:16px">Or paste this link: ${resetUrl}</p>
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:24px 0">
      <p style="color:#7a8499;font-size:12px;margin:0">MentorHub · rajeevshivah.me</p>
    </div>
  `);
};

// ---- Reschedule REQUEST notice (to admin) ----
const sendRescheduleRequestEmail = async (adminEmail, booking) => {
  const r = booking.rescheduleRequest || {};
  await sendEmail(adminEmail, `🔔 Reschedule request from ${booking.studentInfo?.name || "a student"}`, `
    <div style="${baseStyle}">
      <h2 style="color:#f0a500;font-size:22px;margin-bottom:8px">New reschedule request</h2>
      <p style="color:#7a8499;margin-bottom:20px">${booking.studentInfo?.name} wants to move their <strong>${booking.packageName}</strong> session.</p>
      <div style="${detailBox}">
        <p style="margin:0 0 8px"><span style="color:#7a8499">Current:</span> ${booking.date} · ${booking.timeSlot} IST</p>
        <p style="margin:0 0 8px"><span style="color:#7a8499">Requested:</span> <strong style="color:#00d4aa">${r.requestedDate} · ${r.requestedSlot} IST</strong></p>
        ${r.studentMessage ? `<p style="margin:12px 0 0"><span style="color:#7a8499">Message:</span><br>"${r.studentMessage}"</p>` : ""}
      </div>
      <p style="color:#7a8499;font-size:13px">Review it in your admin panel to accept or reject.</p>
    </div>
  `);
};

// ---- Reschedule DECISION notice (to student) ----
const sendRescheduleDecisionEmail = async (email, booking, decision) => {
  const r = booking.rescheduleRequest || {};
  const accepted = decision === "accept";
  await sendEmail(email, accepted ? "✅ Your reschedule was approved" : "Your reschedule request — an update", `
    <div style="${baseStyle}">
      <h2 style="color:${accepted ? "#00d4aa" : "#f0a500"};font-size:22px;margin-bottom:8px">
        ${accepted ? "Reschedule approved 🎉" : "About your reschedule request"}
      </h2>
      <p style="color:#7a8499;margin-bottom:20px">Hi ${booking.studentInfo?.name}, regarding your <strong>${booking.packageName}</strong> session:</p>
      <div style="${detailBox}">
        ${accepted
          ? `<p style="margin:0"><span style="color:#7a8499">New time:</span> <strong style="color:#00d4aa">${booking.date} · ${booking.timeSlot} IST</strong></p>`
          : `<p style="margin:0"><span style="color:#7a8499">Your session stays at:</span> <strong>${booking.date} · ${booking.timeSlot} IST</strong></p>`}
        ${r.adminResponse ? `<p style="margin:12px 0 0"><span style="color:#7a8499">Note from Rajeev:</span><br>"${r.adminResponse}"</p>` : ""}
      </div>
      ${accepted && booking.meetLink ? `<div style="text-align:center;margin-top:8px"><a href="${booking.meetLink}" style="background:#00d4aa;color:#0b0f1a;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Join Meeting →</a></div>` : ""}
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:24px 0">
      <p style="color:#7a8499;font-size:12px;margin:0">MentorHub · rajeevshivah.me</p>
    </div>
  `);
};

// ---- Direct message from admin to student (real email) ----
const sendStudentMessage = async (email, name, subject, message, resources = []) => {
  const resourceHtml = resources.length ? `
    <div style="${detailBox}">
      <p style="margin:0 0 10px;color:#7a8499;font-size:13px">Shared resources:</p>
      ${resources.map(r => `<p style="margin:0 0 8px"><a href="${r.url}" style="color:#00d4aa;text-decoration:none">📎 ${r.title || r.url}</a></p>`).join("")}
    </div>` : "";
  await sendEmail(email, subject || "A message from Rajeev · MentorHub", `
    <div style="${baseStyle}">
      <h2 style="color:#f0a500;font-size:22px;margin-bottom:8px">${subject || "A message for you"}</h2>
      <p style="color:#7a8499;margin-bottom:16px">Hi ${name || "there"},</p>
      <div style="color:#e8eaf0;font-size:15px;line-height:1.7;white-space:pre-wrap;margin-bottom:20px">${message}</div>
      ${resourceHtml}
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:24px 0">
      <p style="color:#7a8499;font-size:12px;margin:0">You can also see this in your MentorHub dashboard · rajeevshivah.me</p>
    </div>
  `);
};

// ---- Booking cancelled BY ADMIN → notify the student ----
const sendCancellationEmail = async (email, booking, reason = "") => {
  await sendEmail(email, `Your ${booking.packageName} session has been cancelled`, `
    <div style="${baseStyle}">
      <h2 style="color:#f0a500;font-size:24px;margin-bottom:8px">Session cancelled</h2>
      <p style="color:#7a8499;margin-bottom:24px">Hi ${booking.studentInfo?.name || "there"}, unfortunately your session below has been cancelled.</p>
      <div style="${detailBox}">
        <p style="margin:0 0 12px"><span style="color:#7a8499">Package:</span> <strong>${booking.packageName}</strong></p>
        <p style="margin:0 0 12px"><span style="color:#7a8499">Was scheduled:</span> ${booking.date} · ${booking.timeSlot} IST</p>
        ${reason ? `<p style="margin:0"><span style="color:#7a8499">Reason:</span> ${reason}</p>` : ""}
      </div>
      <p style="color:#e8eaf0;font-size:14px;line-height:1.7;margin-bottom:20px">
        If you already paid, your refund or a free rebooking will be arranged personally.
        Reply to this email or book a new slot anytime at
        <a href="https://mentorshub.rajeevshivah.me" style="color:#00d4aa;text-decoration:none">mentorshub.rajeevshivah.me</a>.
      </p>
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:24px 0">
      <p style="color:#7a8499;font-size:12px;margin:0">MentorHub · rajeevshivah.me</p>
    </div>
  `);
};

// ---- Booking cancelled BY STUDENT → notify the admin ----
const sendStudentCancelledEmail = async (adminEmail, booking, reason = "") => {
  await sendEmail(adminEmail, `❌ ${booking.studentInfo?.name || "A student"} cancelled: ${booking.packageName}`, `
    <div style="${baseStyle}">
      <h2 style="color:#f0a500;font-size:22px;margin-bottom:8px">Booking cancelled by student</h2>
      <div style="${detailBox}">
        <p style="margin:0 0 12px"><span style="color:#7a8499">Student:</span> <strong>${booking.studentInfo?.name || "-"}</strong> (${booking.studentInfo?.email || "-"})</p>
        <p style="margin:0 0 12px"><span style="color:#7a8499">Package:</span> ${booking.packageName} · ₹${booking.packagePrice}</p>
        <p style="margin:0 0 12px"><span style="color:#7a8499">Was scheduled:</span> ${booking.date} · ${booking.timeSlot} IST</p>
        ${reason ? `<p style="margin:0"><span style="color:#7a8499">Reason:</span> ${reason}</p>` : ""}
      </div>
      <p style="color:#7a8499;font-size:13px;margin:0">The slot is now free again. If payment was made, arrange the refund from the admin panel.</p>
    </div>
  `);
};

module.exports = { sendRescheduleEmail, sendPasswordResetEmail, sendRescheduleRequestEmail, sendRescheduleDecisionEmail, sendStudentMessage, sendCancellationEmail, sendStudentCancelledEmail };
