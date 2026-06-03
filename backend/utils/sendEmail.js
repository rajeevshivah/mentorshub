const nodemailer = require("nodemailer");

// Create email transporter using Gmail
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send booking confirmation email
const sendBookingConfirmation = async (email, booking) => {
  try {
    await transporter.sendMail({
      from: `"MentorHub by Minicimextech" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `✅ Booking Confirmed — ${booking.packageName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0b0f1a;color:#e8eaf0;padding:40px;border-radius:16px">
          <h2 style="color:#f0a500;font-size:28px;margin-bottom:8px">Your session is confirmed! 🎉</h2>
          <p style="color:#7a8499;margin-bottom:24px">Hi ${booking.studentInfo.name}, here are your booking details:</p>

          <div style="background:#131929;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:24px;margin-bottom:24px">
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
            <p style="color:#f0a500;margin:0;font-size:14px">💡 Please be ready 5 minutes before your session. Keep your questions ready for the best experience!</p>
          </div>

          <p style="color:#7a8499;font-size:13px;margin-bottom:4px">Need to reschedule? Login to your dashboard at:</p>
          <a href="${process.env.FRONTEND_URL}/consultancy" style="color:#f0a500">${process.env.FRONTEND_URL}/consultancy</a>

          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:24px 0">
          <p style="color:#7a8499;font-size:12px;margin:0">MentorHub by Minicimextech · Empowering Indian Tech Professionals</p>
        </div>
      `,
    });
    console.log(`📧 Confirmation email sent to ${email}`);
  } catch (error) {
    console.error("❌ Email error:", error.message);
    // Don't throw — booking should still succeed even if email fails
  }
};

// Send reminder email (1 hour before session)
const sendReminder = async (email, booking) => {
  try {
    await transporter.sendMail({
      from: `"MentorHub" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `⏰ Reminder: Your session starts in 1 hour!`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0b0f1a;color:#e8eaf0;padding:40px;border-radius:16px">
          <h2 style="color:#f0a500">Your session is starting soon! ⏰</h2>
          <p>Your <strong>${booking.packageName}</strong> session starts in <strong>1 hour</strong>.</p>
          <p>📅 ${booking.date} · ⏰ ${booking.timeSlot} IST</p>
          ${booking.meetLink ? `
          <a href="${booking.meetLink}" style="background:#f0a500;color:#0b0f1a;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:16px">
            Join Google Meet →
          </a>` : ""}
          <p style="color:#7a8499;font-size:13px;margin-top:24px">See you soon! ✨ — MentorHub Team</p>
        </div>
      `,
    });
    console.log(`⏰ Reminder sent to ${email}`);
  } catch (error) {
    console.error("❌ Reminder email error:", error.message);
  }
};

module.exports = { sendBookingConfirmation, sendReminder };