// ============================================================
// Razorpay checkout helper
// The key id comes from the backend (/api/rzp/order), so no Vercel
// env var is needed. Amount, name and colours also come from the
// backend, which reads them from the database.
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

// order: response of POST /api/rzp/order
// onSuccess({ razorpay_order_id, razorpay_payment_id, razorpay_signature })
// onDismiss() — student closed the popup without paying
// onFailed(message) — a payment attempt failed (they may retry inside the popup)
export const openCheckout = ({ order, onSuccess, onDismiss, onFailed }) => {
  const rzp = new window.Razorpay({
    key: order.keyId,
    amount: order.amount,
    currency: order.currency,
    order_id: order.orderId,
    name: order.name,
    description: order.description,
    prefill: order.prefill,
    theme: { color: order.themeColor },
    handler: (response) => onSuccess(response),
    modal: {
      ondismiss: () => onDismiss && onDismiss(),
      confirm_close: true,
    },
  });
  rzp.on("payment.failed", (response) => {
    onFailed && onFailed(response?.error?.description || "Payment failed");
  });
  rzp.open();
};
