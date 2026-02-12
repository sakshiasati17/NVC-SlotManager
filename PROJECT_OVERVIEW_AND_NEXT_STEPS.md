# Slot Time (NVC Slot Manager) – Overview & Next Steps

## What this app is

**Slot Time** is a slot-booking app: one link per event, participants sign up for time slots, swap with others, or join a waitlist. No spreadsheets.

- **Admins** create events, add slots (bulk / one / a few), see total vs available vs taken, export CSV, and use an audit log.
- **Participants** sign in (Google, Microsoft, or email), see only their own bookings, add slots to Google/Outlook/Apple calendar, request or accept/decline swaps, and get email + optional SMS reminders.

**Live:** [https://nvc-slot-manager.vercel.app](https://nvc-slot-manager.vercel.app)

---

## What’s already built

| Area | What’s done |
|------|------------------|
| **Auth** | Admin: email magic link, Google, Microsoft. Participant: same + email/password sign up. Participants don’t see Admin; homepage shows “Admin” / “Create an event” only to admins. |
| **Events & slots** | Create events, bulk generate slots, add one slot, add a few slots (3–20). Slot overview: total / available / taken. Table with time, label, status, participant. |
| **Signup** | Request signup → email confirmation link → booking created. Waitlist. “Notify when full” for organizer. |
| **My bookings** | Upcoming + past, calendar links (Google / Outlook / .ics), View event, Request swap, Cancel. No admin links. Empty state: “See open events”. |
| **Swaps** | Request swap (pick a taken slot), accept/decline. Incoming swap requests on event page and My bookings. Emails for request/accept/decline. |
| **Emails** | Resend: signup confirm, waitlist, cancel, swap, reminders, slot removed, notify-when-full. |
| **Reminders** | Cron: 24h, 30m, 15m before slot (email + optional Twilio SMS). |
| **Calendar** | Add to Google Calendar, Outlook, or download .ics (Apple etc.). |
| **DB** | Supabase: events, slots, bookings, waitlist, swap_requests, signup_verifications, reminder_sent, audit_log, event_roles. RLS and RPCs. |

Docs in the repo: **ENV_VARS.md**, **SUPABASE_SETUP.md**, **DEPLOY_VERCEL.md**, **FEATURES.md**.

---

## Next steps (in order)

### 1. Make sure production is fully working

- [ ] **Supabase:** Run any migrations you haven’t run yet in the SQL Editor (see list below). If you see “Could not find the table 'public.signup_verifications'”, run **004_signup_verifications.sql**. For analytics (signup/cancel/swap counts), run **005_audit_booking_confirmed_trigger.sql**. (See SUPABASE_SETUP.md → Troubleshooting.)
- [ ] **Vercel:** Set `NEXT_PUBLIC_APP_URL=https://nvc-slot-manager.vercel.app` (and all other vars from ENV_VARS.md). Redeploy after changing env.
- [ ] **Supabase Auth:** Site URL = production URL; Redirect URLs include `https://nvc-slot-manager.vercel.app/**`. For Google/Microsoft, add production URL to Authorized JavaScript origins (Google) and redirect URI (Azure). See SUPABASE_SETUP.md → Step 2b.
- [ ] **Cron:** Reminder cron hits `https://nvc-slot-manager.vercel.app/api/cron/reminders?secret=YOUR_CRON_SECRET` every 5–10 minutes (e.g. cron-job.org).

### 2. Use it with real users

- [ ] Create a test event, add slots, share the event link.
- [ ] Sign up as a participant (Google/Outlook/email), confirm email, check My bookings and calendar links.
- [ ] Test swap request and accept/decline.
- [ ] Confirm reminder emails (and SMS if Twilio is set) at 24h, 30m, 15m.

### 3. Optional enhancements (when you’re ready)

| Idea | Status |
|------|--------|
| **Bulk email to participants** | Done – “Email participants” in admin: email all confirmed, or send booking link to a list. |
| **Timezone selector** | Done – Event page and admin slots table: “Show times in” dropdown. |
| **More slot actions** | Done – Edit slot time/label and Duplicate slot in admin slots table. |
| **Analytics** | Done – Signup/cancel/swap counts and rates per event in admin (uses audit_log). |
| **Custom domain** | Add domain in Vercel, set `NEXT_PUBLIC_APP_URL` and Supabase redirect URLs to that domain. |
| **QR code for event** | Generate a QR that points to `https://your-app.com/e/{slug}`; show on event page or in export. |

### 4. Maintenance

- [ ] Keep Supabase and Vercel on free tier limits (DB size, bandwidth, cron).
- [ ] If you add new env vars, add them to ENV_VARS.md and set them in Vercel (and `.env.local` for local dev).
- [ ] After pulling new code, run any new SQL in `supabase/migrations/` in Supabase SQL Editor if the README or migrations mention it.

---

## Quick reference

| I want to… | Where to look |
|------------|----------------|
| Set env vars | **ENV_VARS.md** |
| Fix Supabase (tables, auth, OAuth) | **SUPABASE_SETUP.md** |
| Deploy or fix Vercel | **DEPLOY_VERCEL.md** |
| See what’s implemented | **FEATURES.md** |
| Fix “signup_verifications” error | **SUPABASE_SETUP.md** → Troubleshooting; run **supabase/migrations/004_signup_verifications.sql** |

---

---

## What’s left (checklist)

**Local:** Build and lint pass. No code changes required unless you add features.

**Supabase (one-time / when you add migrations):**

| Migration | When to run |
|-----------|-------------|
| `004_signup_verifications.sql` | If you see “Could not find signup_verifications”. |
| `005_audit_booking_confirmed_trigger.sql` | For analytics (signup/cancel/swap counts). Run in SQL Editor after deploy. |

**Vercel:** Push your branch and let Vercel deploy (or redeploy). Ensure all env vars from **ENV_VARS.md** are set (especially `NEXT_PUBLIC_APP_URL`, Supabase keys, Resend, optional `CRON_SECRET`, Twilio).

**Supabase Auth:** Site URL and Redirect URLs must include your production URL. For Google/Microsoft OAuth, add the production URL to Authorized origins and redirect URIs.

**Cron (reminders):** If you want email/SMS reminders, set `CRON_SECRET` in Vercel and call `https://your-app.com/api/cron/reminders?secret=YOUR_CRON_SECRET` every 5–10 min (e.g. cron-job.org).

**Summary:** The app is ready for real use. Next steps are: (1) run any missing Supabase migrations, (2) confirm production config and cron on Vercel/Supabase, (3) test with real users, (4) keep env and DB in sync as you change things.
