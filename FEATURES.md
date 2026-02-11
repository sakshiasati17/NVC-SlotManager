# Slot Time – Features We Discussed (All Implemented)

This document lists every feature we discussed and where it lives in the codebase.

---

## 1. Email verification before signup

- **Flow:** Participant signs up → we send a “confirm your email” link → they click it → booking is created.
- **DB:** `signup_verifications` table; RPCs `get_signup_verification`, `complete_signup_verification` in `supabase/RUN_THIS_IN_SUPABASE.sql`.
- **API:**  
  - `POST /api/events/[slug]/request-signup` – creates verification, sends **confirmSignupEmail**.  
  - `GET /api/events/[slug]/confirm-signup?token=...` – validates token.  
  - `POST /api/events/[slug]/confirm-signup` – completes signup (creates booking), sends **signupConfirmation**.
- **UI:** Event schedule uses request-signup for main signup; button “Confirm my email & sign up”; note: “We’ll send a confirmation link to your email. Click it to complete your signup.” Requires login; “Sign in to sign up” when not logged in.
- **Page:** `src/app/e/[slug]/confirm-signup/page.tsx` – token from query, validate then POST to complete; success/error and “View schedule & manage booking” link.

---

## 2. Emails for every action

All templates live in `src/lib/email/templates.ts`; sending in `src/lib/email/send.ts`.

| Action | Template | Where sent |
|--------|----------|------------|
| Request signup (confirm email) | `confirmSignupEmail` | `request-signup` → participant |
| Signup completed | `signupConfirmation` | `confirm-signup` POST + `POST /api/bookings` (direct booking) |
| Join waitlist | `waitlistJoined` | `POST /api/bookings` with `join_waitlist: true` |
| Participant cancels | `bookingCancelled` | `DELETE /api/bookings/[id]` → participant |
| Participant cancels | `participantCancelledNotifyOrganizer` | `DELETE /api/bookings/[id]` → `event.notify_email` |
| Waitlist promoted | `waitlistPromoted` | `DELETE /api/bookings/[id]` → promoted participant |
| Admin removes slot | `bookingCancelled` (reason: slot_removed) | `DELETE /api/admin/slots/[id]` |
| Swap requested | `swapRequest` | `POST /api/swap` → target participant |
| Swap accepted | `swapAccepted` | `POST /api/swap/[id]/respond` (accept) → requester + target |
| Swap declined | `swapDeclined` | `POST /api/swap/[id]/respond` (decline) → requester |
| “Notify when full” | `participantNoSlotQuery` | `POST /api/events/[slug]/notify-full` → organizer |

---

## 3. Reminders (24h, 30m, 15m before slot)

- **DB:** `reminder_sent` table (`booking_id`, `reminder_type` `'24h'|'30m'|'15m'`, `sent_at`) in `supabase/RUN_THIS_IN_SUPABASE.sql`.
- **Cron:** `GET /api/cron/reminders?secret=CRON_SECRET` in `src/app/api/cron/reminders/route.ts`.  
  Uses `REMINDER_WINDOWS` (24h, 30m, 15m); sends `reminder` template with `whenLabel`; inserts into `reminder_sent` so each type is sent once per booking. Call every 5–15 minutes (e.g. cron-job.org).
- **Template:** `reminder` in `src/lib/email/templates.ts`.

---

## 4. Event schedule & event page

- **Event schedule:** `src/app/e/[slug]/event-schedule.tsx`  
  - Accepts `user`, `initialSlotId`.  
  - `isOwnBooking(booking)`, `goToLogin(slotId?)`.  
  - Main signup → request-signup; message “Check your email…”.  
  - Waitlist → `POST /api/bookings` with `join_waitlist: true`.  
  - Cancel only for own booking.  
  - “Sign in to sign up” / “Sign in to request swap” when no user.  
  - Team name field; “Confirm my email & sign up” and note text.
- **Event page:** `src/app/e/[slug]/page.tsx` – passes `user` and `initialSlotId` from `searchParams.slot`; fetches user via `supabase.auth.getUser()`; bookings include `auth_user_id`; footer “Have a signup? Sign in to cancel or change it.”

---

## 5. Middleware & auth

- **Middleware:** `src/lib/supabase/middleware.ts` – if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing, returns without creating Supabase client (avoids 500 on Vercel when env not set).  
  Entry: `src/middleware.ts`.
- **Auth callback:** `src/app/auth/callback/page.tsx` – `useSearchParams()` wrapped in `<Suspense>` for Next.js.

---

## 6. Deploy on Vercel

- **Config:** `vercel.json` (Next.js, buildCommand).
- **Docs:** `DEPLOY_VERCEL.md` – steps, env vars (Supabase URL/anon key, APP_URL, Resend, CRON_SECRET), Supabase redirect URLs, reminder cron (e.g. every 10 min).
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`.

---

## 7. Other docs

- `SUPABASE_SETUP.md` – Supabase setup.
- `EMAIL_SETUP.md` – Email (Resend) setup.
- `BEFORE_SUBMITTING.md` – Pre-submission checklist.

---

All of the above features are implemented and wired in the repo.
