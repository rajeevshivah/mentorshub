const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getToken = () => localStorage.getItem("mentorToken");

const request = async (method, endpoint, body = null) => {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);
  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  // Parse JSON defensively — some errors (rate limit, gateway) return plain text.
  let data;
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { success: false, error: text || "Unexpected server response" };
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Too many requests — please wait a minute and try again.");
    }
    throw new Error(data.error || "Something went wrong");
  }
  return data;
};

export const authAPI = {
  register: (data) => request("POST", "/auth/register", data),
  login: (data) => request("POST", "/auth/login", data),
  google: (credential) => request("POST", "/auth/google", { credential }),
  getMe: () => request("GET", "/auth/me"),
  updateProfile: (data) => request("PUT", "/auth/profile", data),
  forgotPassword: (email) => request("POST", "/auth/forgot-password", { email }),
  resetPassword: (token, password) => request("POST", "/auth/reset-password", { token, password }),
};

export const bookingAPI = {
  // create now sends packageId + paymentId; server derives price.
  create: (data) => request("POST", "/bookings", data),
  getMyBookings: () => request("GET", "/bookings"),
  cancel: (id, reason) => request("PUT", `/bookings/${id}/cancel`, { reason }),
  reschedule: (id, date, timeSlot, message) => request("PUT", `/bookings/${id}/reschedule`, { date, timeSlot, message }),
};

export const paymentAPI = {
  // amount no longer sent — server uses packageId
  createOrder: (packageId) => request("POST", "/payments/create-order", { packageId }),
  verify: (data) => request("POST", "/payments/verify", data),
};

export const slotAPI = {
  getAvailable: (date) => request("GET", `/slots/available?date=${date}`),
};

export const packageAPI = {
  getActive: (brand = "tech") => request("GET", `/packages?brand=${brand}`),
  getAll: (brand) => request("GET", brand ? `/packages/admin/all?brand=${brand}` : "/packages/admin/all"),
  create: (data) => request("POST", "/packages", data),
  update: (id, data) => request("PUT", `/packages/${id}`, data),
  remove: (id) => request("DELETE", `/packages/${id}`),
};

export const adminAPI = {
  getStats: () => request("GET", "/admin/stats"),
  getToday: () => request("GET", "/admin/today"),
  getBookings: (q = "", status = "all") =>
    request("GET", `/admin/bookings?q=${encodeURIComponent(q)}&status=${status}`),
  updateBooking: (id, data) => request("PUT", `/admin/bookings/${id}`, data),
  sendNote: (id, note) => request("POST", `/admin/bookings/${id}/note`, { note }),
  sendEmailToStudent: (id, subject, message) => request("POST", `/admin/bookings/${id}/email`, { subject, message }),
  addResource: (id, title, url, type) => request("POST", `/admin/bookings/${id}/resource`, { title, url, type }),
  removeResource: (id, resourceId) => request("DELETE", `/admin/bookings/${id}/resource/${resourceId}`),
  createManualBooking: (data) => request("POST", "/admin/bookings/manual", data),
  getPayments: () => request("GET", "/admin/payments"),
  refundPayment: (id, opts = {}) => request("PUT", `/payments/${id}/refund`, opts),
  getSlots: () => request("GET", "/admin/slots"),
  addSlot: (time) => request("POST", "/admin/slots", { time }),
  toggleSlot: (id, isActive) => request("PUT", `/admin/slots/${id}`, { isActive }),
  deleteSlot: (id) => request("DELETE", `/admin/slots/${id}`),
  getStudents: () => request("GET", "/admin/students"),
  getBlockedDates: () => request("GET", "/admin/blocked-dates"),
  blockDate: (date, reason) => request("POST", "/admin/blocked-dates", { date, reason }),
  blockDateRange: (startDate, endDate, reason) =>
    request("POST", "/admin/blocked-dates/range", { startDate, endDate, reason }),
  unblockDate: (id) => request("DELETE", `/admin/blocked-dates/${id}`),
  cleanDatabase: (options) => request("DELETE", "/admin/clean-database", options),
  // Booking lifecycle
  confirmUpiPayment: (id, meetLink) => request("PUT", `/bookings/${id}/confirm-upi`, { meetLink }),
  completeBooking: (id, sessionNotes) => request("PUT", `/bookings/${id}/complete`, { sessionNotes }),
  rescheduleBooking: (id, date, timeSlot) => request("PUT", `/bookings/${id}/reschedule`, { date, timeSlot }),
  respondReschedule: (id, decision, response) => request("PUT", `/bookings/${id}/reschedule-respond`, { decision, response }),
};

export const testimonialAPI = {
  submit: (data) => request("POST", "/testimonials", data),
  getApproved: () => request("GET", "/testimonials"),
  getAll: () => request("GET", "/testimonials/admin/all"),
  approve: (id) => request("PUT", `/testimonials/${id}/approve`),
  delete: (id) => request("DELETE", `/testimonials/${id}`),
};
