# Email notifications – set up for production

Slot Time sends real emails for confirmations, swap requests, and reminders. To enable them in a real-world deployment, configure Resend (or another provider) as below.

---

## 1. Get Resend API key

1. Sign up at [resend.com](https://resend.com).
2. Create an API key (API Keys → Create).
3. Add to `.env.local` (and to your production env, e.g. Vercel):

```bash
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=Your App Name <onboarding@resend.dev>
```

- **Development:** You can use `onboarding@resend.dev` as the sender (Resend allows this for testing).
- **Production:** Use a verified domain in Resend and set e.g. `EMAIL_FROM=Slot Time <noreply@yourdomain.com>`.

---

## 2. Set app URL (required for links in emails)

All emails contain links back to your app (view schedule, cancel, swap, accept/decline). Set:

```bash
NEXT_PUBLIC_APP_URL=https://your-actual-domain.com
```

Use your production URL. Without this, links in emails may point to localhost and break for participants.

---

## 3. Notifications that are sent (all activity)

| When | Who gets the email |
|------|--------------------|
| **Participant signs up for a slot** | Participant – confirmation with slot details and link to cancel or swap |
| **Participant cancels their booking** | Participant – confirmation that the booking was cancelled |
| **Organizer removes a participant from a slot** | That participant – notice that they were removed from the slot |
| **Organizer deletes a slot that had a booking** | That participant – notice that the slot was removed |
| **Someone requests a swap with you** | Person in the target slot – request to accept or decline the swap |
| **You accept a swap** | Both you and the other person – confirmation with your new slot time |
| **Someone declines your swap request** | You (the requester) – notice that the swap was declined |
| **Participant can’t get a slot and sends a message** | Event’s “Email for participant messages” – organizer receives name, email, and message |
| **Reminders (if cron is set up)** | Participants get an email **1 day before**, **30 minutes before**, and **15 minutes before** their slot – each reminder sent once per booking |

---

## 4. Reminder emails (optional)

Each participant gets **three** reminders per booking: **1 day before**, **30 minutes before**, and **15 minutes before** their slot. A cron job must call the API so these are sent:

- Set `CRON_SECRET` in your env (e.g. a random string).
- Call **GET** `https://your-app.com/api/cron/reminders?secret=YOUR_CRON_SECRET` **every 5–15 minutes** (e.g. every 10 min). The API sends only reminders that are due and skips any already sent.

If you don’t set this up, the rest of the app and all other emails still work; only reminder emails are skipped.

---

## 5. Verify it works

1. Set `RESEND_API_KEY`, `EMAIL_FROM`, and `NEXT_PUBLIC_APP_URL`.
2. Restart the app.
3. As a participant, sign up for a slot and check the inbox for the confirmation email.
4. Request a swap (with another account in another slot) and check that the other person receives the swap-request email.

If you don’t set `RESEND_API_KEY`, the app runs normally but no emails are sent (you’ll see a warning in the server logs in development).
