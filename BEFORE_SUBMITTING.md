# Before Submitting to Your Manager — Checklist

Use this checklist before handing off the NVC Slot Manager for real use.

---

## 1. Supabase (Backend)

- [ ] **Project** created at [supabase.com](https://supabase.com); env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in `.env.local`.
- [ ] **SQL** run in Supabase SQL Editor:
  - Main schema: `supabase/RUN_THIS_IN_SUPABASE.sql`
  - Optional: `supabase/migrations/004_add_notify_email.sql` (adds admin notification email column).
- [ ] **Auth** → Email provider enabled; **Redirect URLs** include your app URL (e.g. `http://localhost:3000/**` for dev, `https://your-domain.com/**` for production).

---

## 2. Email notifications (required for real use)

- [ ] Follow **[EMAIL_SETUP.md](./EMAIL_SETUP.md)** to configure Resend.
- [ ] Set `RESEND_API_KEY`, `EMAIL_FROM`, and `NEXT_PUBLIC_APP_URL` in `.env.local` (and in production env).
- [ ] Without these, **no emails are sent** (confirmations, swap requests, participant messages, reminders). The app still works, but participants and organizers won’t get notifications.

---

## 3. App URL (for links in emails)

- [ ] For production, set `NEXT_PUBLIC_APP_URL=https://your-actual-domain.com` (e.g. Vercel URL or custom domain).
- [ ] Add the same URL to Supabase **Redirect URLs** so magic links work after deploy.

---

## 4. Reminder cron (optional)

- [ ] Set `CRON_SECRET` in env (e.g. a random string).
- [ ] Call **GET** `https://your-app.com/api/cron/reminders?secret=YOUR_CRON_SECRET` every 5–15 min (e.g. every 10 min). Sends reminder emails 1 day, 30 min, and 15 min before each slot.

---

## 5. Quick test flow

- [ ] **Admin:** Sign in at `/admin/login` (magic link). Create an event, set “Admin notification email”, bulk-generate slots, open “Manage” and confirm table/export.
- [ ] **Participant:** Open `/e/your-event-slug`. Sign in, sign up for a slot (optional: team name). Check email for confirmation.
- [ ] **All full:** Fill all slots (or use one slot only). As a different user, open the event; confirm “All slots are full” and “Notify organizer” form; submit and check admin email.
- [ ] **Swap:** With two users with different slots, use “Request swap” and then “Swap requests for you” to accept/decline.
- [ ] **Admin:** Export CSV (includes Team column), duplicate event, delete event (test on a copy).

---

## 6. Deploy (e.g. Vercel)

- [ ] Push code to GitHub; connect repo to Vercel.
- [ ] In Vercel project **Settings → Environment Variables**, add all env vars (Supabase, Resend, `NEXT_PUBLIC_APP_URL`, optional `CRON_SECRET`).
- [ ] In Supabase **Redirect URLs**, add `https://your-vercel-app.vercel.app/**`.
- [ ] Deploy and retest sign-in and at least one full flow.

---

## 7. Handoff to manager

- [ ] Share the **production URL** and confirm who will be the first admin (they sign in with their email at `/admin/login`).
- [ ] Document where the **public event link** lives: `/e/[slug]` (e.g. `https://your-app.com/e/nvc-2025`).
- [ ] Mention that **notification email** per event must be set (create event or “Admin notification email” in Manage) so “all slots filled” and “no slot available” emails reach the right person.

---

## Summary

| Item | Required for go-live |
|------|----------------------|
| Supabase project + SQL + Auth redirect | Yes |
| Resend API key + EMAIL_FROM | Yes (for emails) |
| NEXT_PUBLIC_APP_URL (production) | Yes (for correct links) |
| CRON_SECRET + cron job | Optional (reminders) |

Once the checklist is done, the app is ready for your manager to use for real events.
