// ============================================================
// brandMeta — one place that knows how each brand presents
// itself in emails. Booking.brand decides which one applies;
// anything unknown falls back to tech so old bookings
// (which have no brand field) keep their existing emails.
// ============================================================
const BRANDS = {
  tech: {
    name: "MentorHub",
    sender: "MentorHub by Rajeev Shivah",
    url: "mentorshub.rajeevshivah.me",
    accent: "#f0a500",
  },
  meditation: {
    name: "talkWithShivah",
    sender: "talkWithShivah · Rajeev",
    url: "talkwithshivah.rajeevshivah.me",
    accent: "#9a82f2",
  },
};

module.exports = (brand) => BRANDS[brand] || BRANDS.tech;
