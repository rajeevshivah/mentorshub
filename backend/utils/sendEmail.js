const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const baseStyle = `font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0b0f1a;color:#e8eaf0;padding:40px;border-radius:16px`;
const detailBox = `background:#131929;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:24px;margin-bottom:24px`;

// ---- Booking confirmed (Razorpay) ----
const sendBookingConfirmation = async (email, booking) => {
  try {
    await transporter.sendMail({
      from: `"MentorHub by Rajeev Shivah" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `✅ Booking Confirmed — ${booking.packageName}`,
      html: `
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
          <div style="background:#f0a50011;border:1px solid #f0a50033;border-radius:12px;padding:16px;margin-bottom:24px">
            <p style="color:#f0a500;margin:0;font-size:14px">💡 Please be ready 5 minutes before your session. Keep your questions ready!</p>
          </div>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:24px 0">
          <p style="color:#7a8499;font-size:12px;margin:0">MentorHub · rajeevshivah.me · Empowering Indian Tech Professionals</p>
        </div>
      `,
    });
    console.log(`📧 Confirmation email sent to ${email}`);
  } catch (error) {
    console.error("❌ Email error:", error.message);
  }
};

// ---- UPI payment pending — waiting for admin confirmation ----
const sendUpiPendingEmail = async (email, booking) => {
  try {
    await transporter.sendMail({
      from: `"MentorHub by Rajeev Shivah" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `⏳ Booking Received — Payment Verification Pending`,
      html: `
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
          <p style="color:#7a8499;font-size:12px;margin:0">MentorHub · rajeevshivah.me</p>
        </div>
      `,
    });
    console.log(`⏳ UPI pending email sent to ${email}`);
  } catch (error) {
    console.error("❌ UPI pending email error:", error.message);
  }
};

// ---- UPI payment confirmed by admin ----
const sendUpiConfirmedEmail = async (email, booking) => {
  try {
    await transporter.sendMail({
      from: `"MentorHub by Rajeev Shivah" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `✅ Payment Verified — Session Confirmed!`,
      html: `
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
          <div style="background:#f0a50011;border:1px solid #f0a50033;border-radius:12px;padding:16px;margin-bottom:24px">
            <p style="color:#f0a500;margin:0;font-size:14px">💡 Please be ready 5 minutes before your session!</p>
          </div>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:24px 0">
          <p style="color:#7a8499;font-size:12px;margin:0">MentorHub · rajeevshivah.me</p>
        </div>
      `,
    });
    console.log(`✅ UPI confirmed email sent to ${email}`);
  } catch (error) {
    console.error("❌ UPI confirmed email error:", error.message);
  }
};

// ---- Reminder (1 hour before) ----
const sendReminder = async (email, booking) => {
  try {
    await transporter.sendMail({
      from: `"MentorHub" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `⏰ Reminder: Your session starts in 1 hour!`,
      html: `
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
      `,
    });
    console.log(`⏰ Reminder sent to ${email}`);
  } catch (error) {
    console.error("❌ Reminder email error:", error.message);
  }
};

module.exports = { sendBookingConfirmation, sendUpiPendingEmail, sendUpiConfirmedEmail, sendReminder };