const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getToken = () => localStorage.getItem("mentorToken");

const request = async (method, endpoint, body = null) => {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);
  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong");
  return data;
};

export const authAPI = {
  register: (data) => request("POST", "/auth/register", data),
  login: (data) => request("POST", "/auth/login", data),
  getMe: () => request("GET", "/auth/me"),
};

export const bookingAPI = {
  create: (data) => request("POST", "/bookings", data),
  getMyBookings: () => request("GET", "/bookings"),
  cancel: (id, reason) => request("PUT", `/bookings/${id}/cancel`, { reason }),
};

export const paymentAPI = {
  createOrder: (amount, packageName) =>
    request("POST", "/payments/create-order", { amount, packageName }),
  verify: (data) => request("POST", "/payments/verify", data),
};

export const slotAPI = {
  getAvailable: (date) => request("GET", `/slots/available?date=${date}`),
};

export const adminAPI = {
  getStats: () => request("GET", "/admin/stats"),
  getBookings: () => request("GET", "/admin/bookings"),
  updateBooking: (id, data) => request("PUT", `/admin/bookings/${id}`, data),
  sendNote: (id, note) => request("POST", `/admin/bookings/${id}/note`, { note }),
  getPayments: () => request("GET", "/admin/payments"),
  getSlots: () => request("GET", "/admin/slots"),
  addSlot: (time) => request("POST", "/admin/slots", { time }),
  toggleSlot: (id, isActive) => request("PUT", `/admin/slots/${id}`, { isActive }),
  deleteSlot: (id) => request("DELETE", `/admin/slots/${id}`),
  getStudents: () => request("GET", "/admin/students"),
};

export const testimonialAPI = {
  submit: (data) => request("POST", "/testimonials", data),
  getApproved: () => request("GET", "/testimonials"),
  getAll: () => request("GET", "/testimonials/admin/all"),
  approve: (id) => request("PUT", `/testimonials/${id}/approve`),
  delete: (id) => request("DELETE", `/testimonials/${id}`),
};