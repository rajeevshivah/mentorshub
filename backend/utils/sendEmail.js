// const nodemailer = require("nodemailer");

// const baseStyle = `font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0b0f1a;color:#e8eaf0;padding:40px;border-radius:16px`;
// const detailBox = `background:#131929;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:24px;margin-bottom:24px`;


// const getTransporter = () => nodemailer.createTransport({
//   host: process.env.EMAIL_HOST || "smtp-relay.brevo.com",
//   port: Number(process.env.EMAIL_PORT) || 587,
//   secure: false,
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// // ---- Booking confirmed (Razorpay) ----
// const sendBookingConfirmation = async (email, booking) => {
//   try {
//     await getTransporter().sendMail({
//       from: `"MentorHub by Rajeev Shivah" <rajeev@rajeevshivah.me>`,
//       to: email,
//       subject: `✅ Booking Confirmed — ${booking.packageName}`,
//       html: `
//         <div style="${baseStyle}">
//           <h2 style="color:#f0a500;font-size:28px;margin-bottom:8px">Your session is confirmed! 🎉</h2>
//           <p style="color:#7a8499;margin-bottom:24px">Hi ${booking.studentInfo.name}, here are your booking details:</p>
//           <div style="${detailBox}">
//             <p style="margin:0 0 12px"><span style="color:#7a8499">📦 Package:</span> <strong>${booking.packageName}</strong></p>
//             <p style="margin:0 0 12px"><span style="color:#7a8499">⏱ Duration:</span> <strong>${booking.packageDuration}</strong></p>
//             <p style="margin:0 0 12px"><span style="color:#7a8499">📅 Date:</span> <strong>${booking.date}</strong></p>
//             <p style="margin:0 0 12px"><span style="color:#7a8499">⏰ Time:</span> <strong>${booking.timeSlot} IST</strong></p>
//             <p style="margin:0"><span style="color:#7a8499">💰 Amount Paid:</span> <strong style="color:#f0a500">₹${booking.packagePrice}</strong></p>
//           </div>
//           ${booking.meetLink ? `
//           <div style="background:#00d4aa11;border:1px solid #00d4aa33;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
//             <p style="color:#00d4aa;margin:0 0 12px;font-weight:bold">📹 Your Google Meet Link</p>
//             <a href="${booking.meetLink}" style="background:#00d4aa;color:#0b0f1a;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
//               Join Meeting →
//             </a>
//           </div>` : ""}
//           <div style="background:#f0a50011;border:1px solid #f0a50033;border-radius:12px;padding:16px;margin-bottom:24px">
//             <p style="color:#f0a500;margin:0;font-size:14px">💡 Please be ready 5 minutes before your session. Keep your questions ready!</p>
//           </div>
//           <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:24px 0">
//           <p style="color:#7a8499;font-size:12px;margin:0">${bm.name} · ${bm.url} · Empowering Indian Tech Professionals</p>
//         </div>
//       `,
//     });
//     console.log(`📧 Confirmation email sent to ${email}`);
//   } catch (error) {
//     console.error("❌ Email error:", error.message);
//   }
// };

// // ---- UPI payment pending ----
// const sendUpiPendingEmail = async (email, booking) => {
//   console.log("📧 Attempting to send UPI pending email to:", email);
//   console.log("📧 Using SMTP:", process.env.EMAIL_HOST, process.env.EMAIL_PORT, process.env.EMAIL_USER);
  
//   try {
//     await getTransporter().sendMail({
//       from: `"MentorHub by Rajeev Shivah" <rajeev@rajeevshivah.me>`,
//       to: email,
//       subject: `⏳ Booking Received — Payment Verification Pending`,
//       html: `
//         <div style="${baseStyle}">
//           <h2 style="color:#f0a500;font-size:24px;margin-bottom:8px">Booking received! ⏳</h2>
//           <p style="color:#7a8499;margin-bottom:24px">Hi ${booking.studentInfo.name}, your booking is under review. Once your UPI payment is verified, you'll receive a confirmation email with your Google Meet link.</p>
//           <div style="${detailBox}">
//             <p style="margin:0 0 12px"><span style="color:#7a8499">📦 Package:</span> <strong>${booking.packageName}</strong></p>
//             <p style="margin:0 0 12px"><span style="color:#7a8499">📅 Date:</span> <strong>${booking.date}</strong></p>
//             <p style="margin:0 0 12px"><span style="color:#7a8499">⏰ Time:</span> <strong>${booking.timeSlot} IST</strong></p>
//             <p style="margin:0 0 12px"><span style="color:#7a8499">💰 Amount:</span> <strong style="color:#f0a500">₹${booking.packagePrice}</strong></p>
//             <p style="margin:0"><span style="color:#7a8499">🔖 Transaction ID:</span> <strong>${booking.upiTransactionId || "—"}</strong></p>
//           </div>
//           <div style="background:#f0a50011;border:1px solid #f0a50033;border-radius:12px;padding:16px;margin-bottom:24px">
//             <p style="color:#f0a500;margin:0;font-size:14px">⏱ Verification usually takes 1-2 hours. If not confirmed within 4 hours, email us at <a href="mailto:rajeev@rajeevshivah.me" style="color:#f0a500">rajeev@rajeevshivah.me</a></p>
//           </div>
//           <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:24px 0">
//           <p style="color:#7a8499;font-size:12px;margin:0">${bm.name} · ${bm.url}</p>
//         </div>
//       `,
//     });
//     console.log(`⏳ UPI pending email sent to ${email}`);
//   } catch (error) {
//     console.error("❌ UPI pending email error:", error.message);
//   }
// };

// // ---- UPI payment confirmed by admin ----
// const sendUpiConfirmedEmail = async (email, booking) => {
//   try {
//     await getTransporter().sendMail({
//       from: `"MentorHub by Rajeev Shivah" <rajeev@rajeevshivah.me>`,
//       to: email,
//       subject: `✅ Payment Verified — Session Confirmed!`,
//       html: `
//         <div style="${baseStyle}">
//           <h2 style="color:#f0a500;font-size:24px;margin-bottom:8px">Payment verified! Your session is confirmed 🎉</h2>
//           <p style="color:#7a8499;margin-bottom:24px">Hi ${booking.studentInfo.name}, your UPI payment has been verified and your session is now confirmed.</p>
//           <div style="${detailBox}">
//             <p style="margin:0 0 12px"><span style="color:#7a8499">📦 Package:</span> <strong>${booking.packageName}</strong></p>
//             <p style="margin:0 0 12px"><span style="color:#7a8499">📅 Date:</span> <strong>${booking.date}</strong></p>
//             <p style="margin:0 0 12px"><span style="color:#7a8499">⏰ Time:</span> <strong>${booking.timeSlot} IST</strong></p>
//             <p style="margin:0"><span style="color:#7a8499">💰 Amount:</span> <strong style="color:#f0a500">₹${booking.packagePrice}</strong></p>
//           </div>
//           ${booking.meetLink ? `
//           <div style="background:#00d4aa11;border:1px solid #00d4aa33;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
//             <p style="color:#00d4aa;margin:0 0 12px;font-weight:bold">📹 Your Google Meet Link</p>
//             <a href="${booking.meetLink}" style="background:#00d4aa;color:#0b0f1a;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
//               Join Meeting →
//             </a>
//           </div>` : ""}
//           <div style="background:#f0a50011;border:1px solid #f0a50033;border-radius:12px;padding:16px;margin-bottom:24px">
//             <p style="color:#f0a500;margin:0;font-size:14px">💡 Please be ready 5 minutes before your session!</p>
//           </div>
//           <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:24px 0">
//           <p style="color:#7a8499;font-size:12px;margin:0">${bm.name} · ${bm.url}</p>
//         </div>
//       `,
//     });
//     console.log(`✅ UPI confirmed email sent to ${email}`);
//   } catch (error) {
//     console.error("❌ UPI confirmed email error:", error.message);
//   }
// };

// // ---- Reminder (1 hour before) ----
// const sendReminder = async (email, booking) => {
//   try {
//     await getTransporter().sendMail({
//       from: `"MentorHub" <rajeev@rajeevshivah.me>`,
//       to: email,
//       subject: `⏰ Reminder: Your session starts in 1 hour!`,
//       html: `
//         <div style="${baseStyle}">
//           <h2 style="color:#f0a500">Your session is starting soon! ⏰</h2>
//           <p>Your <strong>${booking.packageName}</strong> session starts in <strong>1 hour</strong>.</p>
//           <p>📅 ${booking.date} · ⏰ ${booking.timeSlot} IST</p>
//           ${booking.meetLink ? `
//           <a href="${booking.meetLink}" style="background:#f0a500;color:#0b0f1a;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:16px">
//             Join Google Meet →
//           </a>` : ""}
//           <p style="color:#7a8499;font-size:13px;margin-top:24px">See you soon! ✨ — Rajeev Shivah</p>
//         </div>
//       `,
//     });
//     console.log(`⏰ Reminder sent to ${email}`);
//   } catch (error) {
//     console.error("❌ Reminder email error:", error.message);
//   }
// };

// module.exports = { sendBookingConfirmation, sendUpiPendingEmail, sendUpiConfirmedEmail, sendReminder };

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const brandMeta = require("./brandMeta");

const sendEmail = async (to, subject, htmlContent, senderName) => {
  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: senderName || "MentorHub by Rajeev Shivah", email: "rajeev@rajeevshivah.me" },
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

const sendBookingConfirmation = async (email, booking) => {
  const bm = brandMeta(booking.brand);
  try {
    await sendEmail(email, `✅ Booking Confirmed — ${booking.packageName}`, `
      <div style="${baseStyle}">
        <h2 style="color:#f0a500;font-size:28px;margin-bottom:8px">Your session is confirmed! 🎉</h2>
        <p style="color:#7a8499;margin-bottom:24px">Hi ${booking.studentInfo.name}, here are your booking details:</p>
        <div style="${detailBox}">
          <p style="margin:0 0 12px"><span style="color:#7a8499">📦 Package:</span> <strong>${booking.packageName}</strong></p>
          <p style="margin:0 0 12px"><span style="color:#7a8499">⏱ Duration:</span> <strong>${booking.packageDuration}</strong></p>
          <p style="margin:0 0 12px"><span style="color:#7a8499">📅 Date:</span> <strong>${booking.date}</strong></p>
          <p style="margin:0 0 12px"><span style="color:#7a8499">⏰ Time:</span> <strong>${booking.timeSlot} IST</strong></p>
          <p style="margin:0"><span style="color:#7a8499">💰 Amount Paid:</span> <strong style="color:#f0a500">₹${booking.packagePrice}</strong></p>
        </div>
        ${booking.meetLink ? `
        <div style="background:#00d4aa11;border:1px solid #00d4aa33;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
          <p style="color:#00d4aa;margin:0 0 12px;font-weight:bold">📹 Your Google Meet Link</p>
          <a href="${booking.meetLink}" style="background:#00d4aa;color:#0b0f1a;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
            Join Meeting →
          </a>
        </div>` : ""}
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:24px 0">
        <p style="color:#7a8499;font-size:12px;margin:0">${bm.name} · ${bm.url}</p>
      </div>
    `, bm.sender);
  } catch (err) {
    console.error("❌ Email error:", err.message);
  }
};

const sendUpiPendingEmail = async (email, booking) => {
  const bm = brandMeta(booking.brand);
  try {
    await sendEmail(email, `⏳ Booking Received — Payment Verification Pending`, `
      <div style="${baseStyle}">
        <h2 style="color:#f0a500;font-size:24px;margin-bottom:8px">Booking received! ⏳</h2>
        <p style="color:#7a8499;margin-bottom:24px">Hi ${booking.studentInfo.name}, your booking is under review. Once your UPI payment is verified, you'll receive a confirmation email with your Google Meet link.</p>
        <div style="${detailBox}">
          <p style="margin:0 0 12px"><span style="color:#7a8499">📦 Package:</span> <strong>${booking.packageName}</strong></p>
          <p style="margin:0 0 12px"><span style="color:#7a8499">📅 Date:</span> <strong>${booking.date}</strong></p>
          <p style="margin:0 0 12px"><span style="color:#7a8499">⏰ Time:</span> <strong>${booking.timeSlot} IST</strong></p>
          <p style="margin:0 0 12px"><span style="color:#7a8499">💰 Amount:</span> <strong style="color:#f0a500">₹${booking.packagePrice}</strong></p>
          <p style="margin:0"><span style="color:#7a8499">🔖 Transaction ID:</span> <strong>${booking.upiTransactionId || "—"}</strong></p>
        </div>
        <div style="background:#f0a50011;border:1px solid #f0a50033;border-radius:12px;padding:16px;margin-bottom:24px">
          <p style="color:#f0a500;margin:0;font-size:14px">⏱ Verification usually takes 1-2 hours. If not confirmed within 4 hours, email us at <a href="mailto:rajeev@rajeevshivah.me" style="color:#f0a500">rajeev@rajeevshivah.me</a></p>
        </div>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:24px 0">
        <p style="color:#7a8499;font-size:12px;margin:0">${bm.name} · ${bm.url}</p>
      </div>
    `, bm.sender);
  } catch (err) {
    console.error("❌ UPI pending email error:", err.message);
  }
};

const sendUpiConfirmedEmail = async (email, booking) => {
  const bm = brandMeta(booking.brand);
  try {
    await sendEmail(email, `✅ Payment Verified — Session Confirmed!`, `
      <div style="${baseStyle}">
        <h2 style="color:#f0a500;font-size:24px;margin-bottom:8px">Payment verified! Your session is confirmed 🎉</h2>
        <p style="color:#7a8499;margin-bottom:24px">Hi ${booking.studentInfo.name}, your UPI payment has been verified and your session is now confirmed.</p>
        <div style="${detailBox}">
          <p style="margin:0 0 12px"><span style="color:#7a8499">📦 Package:</span> <strong>${booking.packageName}</strong></p>
          <p style="margin:0 0 12px"><span style="color:#7a8499">📅 Date:</span> <strong>${booking.date}</strong></p>
          <p style="margin:0 0 12px"><span style="color:#7a8499">⏰ Time:</span> <strong>${booking.timeSlot} IST</strong></p>
          <p style="margin:0"><span style="color:#7a8499">💰 Amount:</span> <strong style="color:#f0a500">₹${booking.packagePrice}</strong></p>
        </div>
        ${booking.meetLink ? `
        <div style="background:#00d4aa11;border:1px solid #00d4aa33;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
          <p style="color:#00d4aa;margin:0 0 12px;font-weight:bold">📹 Your Google Meet Link</p>
          <a href="${booking.meetLink}" style="background:#00d4aa;color:#0b0f1a;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
            Join Meeting →
          </a>
        </div>` : ""}
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:24px 0">
        <p style="color:#7a8499;font-size:12px;margin:0">${bm.name} · ${bm.url}</p>
      </div>
    `, bm.sender);
  } catch (err) {
    console.error("❌ UPI confirmed email error:", err.message);
  }
};

const sendReminder = async (email, booking) => {
  const bm = brandMeta(booking.brand);
  try {
    await sendEmail(email, `⏰ Reminder: Your session starts in 1 hour!`, `
      <div style="${baseStyle}">
        <h2 style="color:#f0a500">Your session is starting soon! ⏰</h2>
        <p>Your <strong>${booking.packageName}</strong> session starts in <strong>1 hour</strong>.</p>
        <p>📅 ${booking.date} · ⏰ ${booking.timeSlot} IST</p>
        ${booking.meetLink ? `
        <a href="${booking.meetLink}" style="background:#f0a500;color:#0b0f1a;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:16px">
          Join Google Meet →
        </a>` : ""}
        <p style="color:#7a8499;font-size:13px;margin-top:24px">See you soon! ✨ — Rajeev Shivah</p>
      </div>
    `, bm.sender);
  } catch (err) {
    console.error("❌ Reminder email error:", err.message);
  }
};

// ============================================================
// Online payment (Razorpay) emails
// ============================================================

// Escape anything a student typed before it goes into HTML
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
));

const footer = (bm) => `
  <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:24px 0">
  <p style="color:#7a8499;font-size:12px;margin:0">${bm.name} · ${bm.url}</p>`;

const meetBlock = (link) => `
  <div style="background:#00d4aa11;border:1px solid #00d4aa33;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
    <p style="color:#00d4aa;margin:0 0 12px;font-weight:bold">📹 Your Google Meet Link</p>
    <a href="${esc(link)}" style="background:#00d4aa;color:#0b0f1a;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
      Join Meeting →
    </a>
  </div>`;

// Student: paid online → session confirmed, Meet link follows
const sendPaymentReceivedEmail = async (email, booking, payment) => {
  const bm = brandMeta(booking.brand);
  try {
    await sendEmail(email, `✅ Payment received — ${booking.packageName} confirmed`, `
      <div style="${baseStyle}">
        <h2 style="color:${bm.accent};font-size:26px;margin-bottom:8px">Payment received. Your session is confirmed 🎉</h2>
        <p style="color:#7a8499;margin-bottom:24px">Hi ${esc(booking.studentInfo?.name)}, thank you. Here are your booking details:</p>
        <div style="${detailBox}">
          <p style="margin:0 0 12px"><span style="color:#7a8499">📦 Package:</span> <strong>${esc(booking.packageName)}</strong></p>
          <p style="margin:0 0 12px"><span style="color:#7a8499">⏱ Duration:</span> <strong>${esc(booking.packageDuration)}</strong></p>
          <p style="margin:0 0 12px"><span style="color:#7a8499">📅 Date:</span> <strong>${esc(booking.date)}</strong></p>
          <p style="margin:0 0 12px"><span style="color:#7a8499">⏰ Time:</span> <strong>${esc(booking.timeSlot)} IST</strong></p>
          <p style="margin:0 0 12px"><span style="color:#7a8499">💰 Amount Paid:</span> <strong style="color:${bm.accent}">₹${booking.packagePrice}</strong></p>
          <p style="margin:0"><span style="color:#7a8499">🔖 Payment ID:</span> <strong>${esc(payment?.paymentId || "—")}</strong></p>
        </div>
        ${booking.meetLink ? meetBlock(booking.meetLink) : `
        <div style="background:${bm.accent}11;border:1px solid ${bm.accent}33;border-radius:12px;padding:16px;margin-bottom:24px">
          <p style="color:${bm.accent};margin:0;font-size:14px">📹 Your Google Meet link will be emailed to you separately before the session. You'll also see it in your dashboard.</p>
        </div>`}
        ${footer(bm)}
      </div>
    `, bm.sender);
  } catch (err) {
    console.error("❌ Payment received email error:", err.message);
  }
};

// Student: here is your Meet link (sent from admin)
const sendMeetLinkEmail = async (email, booking) => {
  const bm = brandMeta(booking.brand);
  try {
    await sendEmail(email, `📹 Your Meet link — ${booking.packageName} on ${booking.date}`, `
      <div style="${baseStyle}">
        <h2 style="color:${bm.accent};font-size:24px;margin-bottom:8px">Your session link is ready</h2>
        <p style="color:#7a8499;margin-bottom:24px">Hi ${esc(booking.studentInfo?.name)}, here is the link for your session.</p>
        <div style="${detailBox}">
          <p style="margin:0 0 12px"><span style="color:#7a8499">📦 Package:</span> <strong>${esc(booking.packageName)}</strong></p>
          <p style="margin:0 0 12px"><span style="color:#7a8499">📅 Date:</span> <strong>${esc(booking.date)}</strong></p>
          <p style="margin:0"><span style="color:#7a8499">⏰ Time:</span> <strong>${esc(booking.timeSlot)} IST</strong></p>
        </div>
        ${meetBlock(booking.meetLink)}
        ${footer(bm)}
      </div>
    `, bm.sender);
  } catch (err) {
    console.error("❌ Meet link email error:", err.message);
    throw err; // admin action — let the route report it
  }
};

// Admin: a new booking came in (UPI = needs verification, online = needs Meet link)
const sendAdminNewBookingEmail = async (adminEmail, booking) => {
  const bm = brandMeta(booking.brand);
  const online = booking.paymentMethod === "razorpay";
  const action = online
    ? "Paid online. Add a Meet link from Admin → Bookings."
    : `UPI payment to verify. UTR: ${esc(booking.upiTransactionId || "—")}`;
  try {
    await sendEmail(adminEmail, `${online ? "💳 Paid" : "⏳ UPI"} booking: ${booking.packageName} · ${booking.date} ${booking.timeSlot}`, `
      <div style="${baseStyle}">
        <h2 style="color:${bm.accent};font-size:22px;margin-bottom:8px">New ${bm.name} booking</h2>
        <p style="color:#e8eaf0;margin-bottom:20px">${action}</p>
        <div style="${detailBox}">
          <p style="margin:0 0 10px"><span style="color:#7a8499">Student:</span> <strong>${esc(booking.studentInfo?.name)}</strong> · ${esc(booking.studentInfo?.email)} · ${esc(booking.studentInfo?.phone)}</p>
          <p style="margin:0 0 10px"><span style="color:#7a8499">Package:</span> <strong>${esc(booking.packageName)}</strong> (₹${booking.packagePrice})</p>
          <p style="margin:0"><span style="color:#7a8499">When:</span> <strong>${esc(booking.date)} · ${esc(booking.timeSlot)} IST</strong></p>
        </div>
        ${footer(bm)}
      </div>
    `, bm.sender);
  } catch (err) {
    console.error("❌ Admin new-booking email error:", err.message);
  }
};

// Student + admin: money arrived but the slot was gone (checkout left open too long)
const sendSlotConflictEmails = async (payment) => {
  const bm = brandMeta(payment.brand);
  const b = payment.booking || {};
  const student = b.studentInfo || {};
  try {
    if (student.email) {
      await sendEmail(student.email, `Payment received — we'll fix your session time`, `
        <div style="${baseStyle}">
          <h2 style="color:${bm.accent};font-size:22px;margin-bottom:8px">Your payment is safe</h2>
          <p style="color:#7a8499;margin-bottom:20px">Hi ${esc(student.name)}, we received ₹${payment.amount} for <strong>${esc(payment.packageName)}</strong>, but the slot you picked (${esc(b.date)} · ${esc(b.timeSlot)} IST) was booked by someone else before your payment completed.</p>
          <p style="color:#e8eaf0;margin-bottom:20px">Rajeev will contact you within a few hours to pick a new time, or refund you in full if you prefer. Payment ID: <strong>${esc(payment.paymentId)}</strong></p>
          ${footer(bm)}
        </div>
      `, bm.sender);
    }
  } catch (err) {
    console.error("❌ Conflict email (student) error:", err.message);
  }
  try {
    if (process.env.ADMIN_EMAIL) {
      await sendEmail(process.env.ADMIN_EMAIL, `⚠️ Paid but slot taken: ${payment.packageName} · ${b.date} ${b.timeSlot}`, `
        <div style="${baseStyle}">
          <h2 style="color:#ff6b6b;font-size:22px;margin-bottom:8px">Online payment needs attention</h2>
          <p style="color:#e8eaf0;margin-bottom:20px">${esc(student.name)} (${esc(student.email)}, ${esc(student.phone)}) paid ₹${payment.amount} for ${esc(payment.packageName)} on ${esc(b.date)} · ${esc(b.timeSlot)}, but that slot was already taken. No booking was created.</p>
          <p style="color:#7a8499">Open Admin → Payments → Online and use "Rebook" to put it on a new slot after talking to the student, or refund from the Razorpay dashboard and mark it resolved. Payment ID: ${esc(payment.paymentId)}</p>
          ${footer(bm)}
        </div>
      `, bm.sender);
    }
  } catch (err) {
    console.error("❌ Conflict email (admin) error:", err.message);
  }
};

module.exports = {
  sendBookingConfirmation, sendUpiPendingEmail, sendUpiConfirmedEmail, sendReminder,
  sendPaymentReceivedEmail, sendMeetLinkEmail, sendAdminNewBookingEmail, sendSlotConflictEmails,
};