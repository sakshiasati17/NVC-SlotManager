# Verify All Features on Vercel (Production)

Use this checklist to confirm everything works at **https://nvc-slot-manager.vercel.app** (or your production URL).

**Before testing:** In Vercel → Settings → Environment Variables, ensure these are set for **Production**:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` = your production URL
- `RESEND_API_KEY`, `EMAIL_FROM`
- `ADMIN_REQUEST_NOTIFY_EMAIL` (comma-separated, for admin request emails)
- `CRON_SECRET` (if using reminder cron)

---

## 1. Public & Homepage

| Check | How to verify |
|-------|----------------|
| Homepage loads | Open `/` – see "Start your innovation journey", "This website is for booking slots for I&E events only", Programs section, Book a slot section. |
| Responsive | Resize or use phone – layout adapts; nav and buttons stay usable. |
| Dark/light mode | Change system preference (or browser) – page colors follow (if supported). |
| Sign in / Sign up link | Click → goes to `/login`. |
| My bookings (when signed in) | After login, header shows "My bookings" → `/my-bookings`. |
| Skip to main content | Tab from top – "Skip to main content" link appears, focus goes to main. |

---

## 2. Participant Auth (Login)

| Check | How to verify |
|-------|----------------|
| Login page loads | Open `/login` – see "Sign in / Sign up", Google/Microsoft/email options. |
| Google sign-in | Click Google → redirects to Supabase/Google → back to app (redirect URL must be in Supabase + Google Console). |
| Microsoft sign-in | Click Microsoft → same flow (Azure redirect must be set). |
| Email sign-in/sign-up | Use email + password or magic link → confirm if sign-up; then redirect to My bookings or `redirect` param. |
| Back to home | "← Back" goes to `/` or redirect URL. |

---

## 3. Admin Auth & Access

| Check | How to verify |
|-------|----------------|
| Admin login | Open `/admin/login` – sign in with Google/Microsoft/email. |
| Allowed admin → dashboard | After login with an email in `allowed_admins`, redirect to `/admin` – see "All events" and list of events. |
| Non-allowed → request message | Sign in at Admin with an email **not** in `allowed_admins` – see "Admin access requested" and no event list. |
| Staff get email | Use an email not in `allowed_admins`, hit `/admin` once – each address in `ADMIN_REQUEST_NOTIFY_EMAIL` receives one email (check inbox + Resend dashboard). |
| Participant view link | From admin header, "Participant view" → `/`. |

---

## 4. Admin – Events & Slots

| Check | How to verify |
|-------|----------------|
| See all events | On `/admin`, every event in the DB is listed (not only yours). |
| Create event | "Create event" → fill title, slug, date → Create → event appears in list. |
| Copy booking link | Open an event → Manage → "Copy booking link" → paste elsewhere; should be `https://.../e/{slug}`. Button shows "Copied!". |
| Manage any event | Click "Manage" on any event (including one you didn’t create) – schedule, slots, and actions load. |
| Add one slot | Manage event → Add one slot → start/end → save → slot appears. |
| Bulk create slots | Bulk create → date range, duration, optional label template → create → slots appear. |
| Edit slot | Edit a slot → change time/label → save. |
| Delete slot | Delete slot (if no booking, or booking is cancelled). |
| Duplicate slot | Duplicate slot → set new start → new slot created. |
| Export CSV | "Export CSV" → download CSV with slots and participants. |
| Email participants | "Send booking link to a list" – paste emails, send; or "Email all booked" with subject/body. |
| Duplicate event | (If present) Duplicate event → new event + slots created. |
| Analytics | View signups, cancels, swap stats. |
| Audit log | View audit entries for the event. |

---

## 5. Participant – Event Page & Booking

| Check | How to verify |
|-------|----------------|
| Event page by link | Open `/e/{slug}` (e.g. from "Copy booking link") – see event title, description, slots. |
| Sign in to sign up | Not signed in → click "Sign up" on a slot → redirect to login with return to event. |
| Request signup (email confirm) | Signed in → pick a slot → fill email/name/phone → "Confirm my email & sign up" → message "Check your email…". |
| Remind me 1 day before | In signup form, checkbox "Remind me 1 day before" (default on) – can turn off. |
| Confirm signup email | In inbox, open link like `/e/{slug}/confirm-signup?token=...` – "You're signed up!" and booking confirmed. |
| Confirmation page – Add to calendar | On success page after confirm link: "Add to calendar" – Google, Outlook, Apple/.ics. |
| Confirmation page – Share | "Copy share message" → paste – contains event title and booking link. |
| View schedule & manage | From confirmation, "View schedule & manage booking" → event page. |
| My bookings | Header "My bookings" → list of upcoming/past; each has "Add to calendar", "View event", "Request swap" (if allowed), "Cancel". |
| Cancel booking | From event page or My bookings → Cancel → confirm → slot free again; confirmation email. |
| Add to calendar (from My bookings) | Google, Outlook, Apple/.ics for each booking. |
| iCal link | Click Apple/.ics or open `/api/bookings/{id}/ical` – .ics file or calendar add. |

---

## 6. Waitlist & Swap

| Check | How to verify |
|-------|----------------|
| Join waitlist | If event has waitlist and slot is taken, "Join waitlist" → submit → "You're on the waitlist." |
| Request swap | From My bookings, "Request swap" (if event allows) → choose target slot → request sent; target participant gets email. |
| Respond to swap | Open swap response link from email – Accept or Decline; requester gets email. |

---

## 7. Emails (Resend)

| Check | How to verify |
|-------|----------------|
| Signup confirmation | After "Confirm my email & sign up", participant gets confirmation email. |
| Confirm signup link | Email links to `/e/{slug}/confirm-signup?token=...` – completes booking. |
| Admin request | Non-allowed user hits `/admin` → staff emails in `ADMIN_REQUEST_NOTIFY_EMAIL` get one email per new requester. |
| Cancel/swap/reminders | After enabling cron and having bookings, check Resend dashboard for reminder emails (24h, 30m, 15m) and any swap/cancel emails. |

**If emails don’t send:** In Vercel → Logs, look for `[Email] RESEND_API_KEY not set` or `[Email] Send failed:`.

---

## 8. Reminders (Cron)

| Check | How to verify |
|-------|----------------|
| Cron endpoint | Call `GET https://nvc-slot-manager.vercel.app/api/cron/reminders?secret=YOUR_CRON_SECRET` – returns `{ "sent": number }`. |
| Reminders sent | Set up cron-job.org (or similar) to hit that URL every 10 min; create a booking with slot in 24h; after cron runs, participant gets reminder email (and 30m/15m as time approaches). |
| Remind 1 day off | Book with "Remind me 1 day before" unchecked – 24h reminder should not be sent (30m/15m still sent). |

---

## 9. Quick Smoke Test (Minimal)

1. Open **/** – homepage loads.
2. Open **/login** – sign in (e.g. Google).
3. Open **/my-bookings** – list (empty or with bookings).
4. Open **/admin/login** – sign in as allowed admin.
5. Open **/admin** – "All events", create or open an event.
6. Open **/e/{some-slug}** – event page (replace with real slug from admin).
7. From admin, **Copy booking link** – open in incognito; event page loads.

If all of the above work, core flows are working on Vercel.

---

## 10. Common Vercel Issues

| Issue | What to check |
|-------|----------------|
| 500 on auth | Supabase redirect URLs include production URL; `NEXT_PUBLIC_APP_URL` set. |
| Emails not sent | `RESEND_API_KEY` and `EMAIL_FROM` in Vercel; Resend domain verified if using custom domain. |
| "Not authorized" on admin APIs | User is in `allowed_admins` (or created event / has event_roles). |
| Cron not running | `CRON_SECRET` set in Vercel; external cron URL uses correct secret. |
| Middleware warning | Next.js may show middleware deprecation; app still runs. |

---

**Production URL:** https://nvc-slot-manager.vercel.app
