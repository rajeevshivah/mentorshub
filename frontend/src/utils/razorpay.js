// ============================================================
// Razorpay payment helper
// Loads script and opens checkout in one function call
// ============================================================

export const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export const openRazorpay = ({ order, pkg, user, form, onSuccess, onError }) => {
  const rzp = new window.Razorpay({
    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount: order.amount,
    currency: order.currency,
    order_id: order.orderId,
    name: "MentorHub by Minicimextech",
    description: pkg.name,
    image: "https://minicimextech.com/logo.jpeg",
    prefill: {
      name: user.name,
      email: user.email,
      contact: user.phone || form.phone,
    },
    theme: { color: "#f0a500" },
    handler: (response) => onSuccess(response),
    modal: {
      ondismiss: () => onError("Payment cancelled"),
    },
  });

  rzp.on("payment.failed", (response) => {
    onError(response.error.description || "Payment failed");
  });

  rzp.open();
};