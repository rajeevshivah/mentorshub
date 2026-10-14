# Razorpay patch — MentorHub + talkWithShivah

Students can now pay online (UPI, cards, netbanking, wallets, international cards)
on both booking pages. The booking is confirmed the moment the payment succeeds,
with no admin approval needed. Manual UPI QR + UTR stays as the fallback option.

**If the Razorpay keys are missing on Render, both sites behave exactly as before
(manual UPI only, "Coming Soon" card).** So it's safe to deploy the code first and
add the keys afterwards.

Same design as the learn portal: native `fetch` + `crypto`, no Razorpay npm package.

---

## Before you start: two backends

| Frontend | Calls today |
|---|---|
| mentorshub.rajeevshivah.me | `https://mentorshub-yo2q.onrender.com` (current code) |
| talkwithshivah.rajeevshivah.me | `https://mentorshub-6v7r.onrender.com` (old code, same database) |

Everything below uses **yo2q**. Step 5 moves talkWithShivah onto it.

---

## Files

### mentorshub repo (backend → Render yo2q, frontend → Vercel)

| File | Change |
|---|---|
| `backend/models/OnlinePayment.js` | NEW: one record per Razorpay order |
| `backend/routes/razorpay.js` | NEW: `/api/rzp/config`, `/order`, `/verify`, `/webhook`, admin list / rebook / resolve |
| `backend/utils/slotHold.js` | NEW: one "is this slot free?" check (bookings + open checkouts) |
| `backend/server.js` | raw-body parser for the webhook (before `express.json`), mounts `/api/rzp`, old `/api/payments` removed |
| `backend/controllers/bookingController.js` | UPI-only now; UTR required + format-checked + can't be reused; admin emailed on every new booking |
| `backend/models/Booking.js` | `onlinePayment` link (unique) |
| `backend/routes/adminRoutes.js` | "Send Meet link" endpoint; revenue now counted from bookings; Meet-link / conflict counters |
| `backend/routes/slotRoutes.js` | slots in checkout show as unavailable |
| `backend/utils/sendEmail.js` | payment-received, Meet-link, admin new-booking, slot-conflict emails |
| `backend/package.json` + `package-lock.json` | removed the unused `razorpay` package; `engines: node >=18` |
| `backend/controllers/paymentController.js` | **DELETE** (old v1 Razorpay code) |
| `backend/routes/paymentRoutes.js` | **DELETE** (old v1 Razorpay routes) |
| `frontend/src/utils/razorpay.js` | checkout helper (key comes from the backend) |
| `frontend/src/utils/api.js` | `rzpAPI`, `adminAPI.sendMeetLink` |
| `frontend/src/pages/BookingPage.jsx` | "Pay online" option + button when enabled |
| `frontend/src/pages/AdminPage.jsx` | 📹 Send Meet link, overview alerts, online payments in Payments tab |
| `frontend/src/components/OnlinePaymentsPanel.jsx` | NEW: online payment log, rebook / resolve |
| `frontend/src/pages/DashboardPage.jsx` | "Meet link will be emailed" note |
| `frontend/src/components/UpiQrSettings.jsx` | label text only |

### talkwithshivah-frontend repo (→ Vercel)

| File | Change |
|---|---|
| `src/utils/razorpay.js` | same helper as MentorHub |
| `src/utils/api.js` | `rzpAPI`, `settingsAPI` |
| `src/pages/BookingPage.jsx` | "Pay online" option; UPI QR now comes from MentorHub Admin → Payments (talkWithShivah row) |
| `src/pages/DashboardPage.jsx` | "Meet link will be emailed" note |

Group classes (`/classes`, separate classes backend) are untouched.

No new npm packages. No database migration. New collection `onlinepayments` is created automatically.

---

## Setup (in this order)

### 1. Delete the two old files, push the mentorshub repo
Delete `backend/controllers/paymentController.js` and `backend/routes/paymentRoutes.js`, then commit + push.
Render (yo2q) and Vercel (MentorHub) redeploy. With no new keys yet, nothing changes for students.

### 2. Render → yo2q service → Environment
The service already has an old `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` from v1 (probably test keys).
**Replace** them and add the webhook secret:

```
RAZORPAY_KEY_ID          = rzp_live_...    (same Key ID as the learn portal)
RAZORPAY_KEY_SECRET      = ...             (same Key Secret as the learn portal)
RAZORPAY_WEBHOOK_SECRET  = a NEW long random string, e.g. mh-wh-<random>
ADMIN_EMAIL              = your email      (if not set already, for new-booking alerts)
```

Check: open `https://mentorshub-yo2q.onrender.com/api/rzp/config`
→ should show `{"success":true,"enabled":true,"keyId":"rzp_live_..."}`

### 3. Razorpay dashboard → Account & Settings → Webhooks → **Add new webhook**
Keep the learn-portal webhook as it is. This is a second one.

- Webhook URL: `https://mentorshub-yo2q.onrender.com/api/rzp/webhook`
- Secret: the SAME string as `RAZORPAY_WEBHOOK_SECRET` above
- Active events: `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`

Both webhooks receive every payment on the account. Each one ignores orders it didn't
create (returns 200), so learn-portal and MentorHub payments never mix.

### 4. Razorpay → Business website details
Add `mentorshub.rajeevshivah.me` and `talkwithshivah.rajeevshivah.me` and wait for approval.

### 5. talkWithShivah → Vercel → Environment Variables
Set `VITE_API_URL = https://mentorshub-yo2q.onrender.com/api`, push the talkwithshivah-frontend
repo, and redeploy. After that, 6v7r isn't used by anything; suspend it in Render.

(Not needed: `VITE_RAZORPAY_KEY_ID` on Vercel. The key now comes from the backend.)

### 6. Test with a real ₹1 payment
Admin → Packages → create a hidden test package at ₹1 (active), book it on each site,
pay, check the booking is confirmed + emails arrive, send a Meet link from admin,
then refund from Razorpay → Transactions → Payments and deactivate the package.

---

## How it works

1. **Pay** → `POST /api/rzp/order`. The server takes the price from the database,
   checks the slot (blocked dates, 2-hour notice, existing bookings) and **holds the slot for 15 minutes**.
2. Razorpay popup.
3. **Success** → `POST /api/rzp/verify`: HMAC check, fetches the payment from Razorpay, checks it belongs to
   this order with the right amount, captures it if only "authorized", then creates the booking (confirmed).
4. **Webhook** does the same in the background. If the student closes the tab after paying, the booking
   still confirms. Verify + webhook can both arrive; each payment makes exactly one booking.

After payment the student gets a "payment received, confirmed" email; you get a "💳 Paid booking" email.
The booking shows in Admin with **📹 Send Meet link**. One click saves it and emails the student.

### If the slot is gone when the money lands
(Only if checkout stays open past 15 minutes and someone else books that slot.)
No double booking is created. The payment is flagged **"paid · slot taken"**. Student + you get an email.
Fix it in Admin → Payments → Online: **Rebook on a new slot** (confirms + emails) or refund in Razorpay
and **mark resolved**. The Overview shows a red alert until it's handled.

## Other changes worth knowing
- **UPI flow** is the same, except the UTR must look like a real reference (6–35 letters/digits,
  spaces ignored) and the same UTR can't be used for two live bookings.
- The UPI **Confirm** modal now requires a real link (it used to fall back to a dummy
  `meet.google.com/mentorshub-session` link if left empty).
- **Revenue** on the Overview is now the sum of confirmed + completed bookings (UPI + online). It used to
  add up the old `payments` collection, which only had v1 test records.
- Old v1 Razorpay endpoints (`/api/payments/create-order`, `/verify`, `/refund`) are gone. They were
  callable on the live API and could confirm a booking with a test-mode payment.
