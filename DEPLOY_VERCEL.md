# Deploy Slot Time on Vercel

Follow these steps to deploy your app to Vercel (free tier).

---

## 1. Push your code to GitHub

If you haven’t already:

1. Create a repo on [GitHub](https://github.com/new).
2. In your project folder (`slot-time-app`), run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

## 2. Create a Vercel account and import the project

1. Go to [vercel.com](https://vercel.com) and sign up (e.g. with GitHub).
2. Click **Add New…** → **Project**.
3. **Import** your GitHub repository (e.g. `slot-time-app`).
4. Leave **Framework Preset** as **Next.js** and **Root Directory** as `.` (or the folder that contains `package.json`).
5. Do **not** click Deploy yet — add environment variables first.

---

## 3. Add environment variables in Vercel

In the project import screen, open **Environment Variables** and add:

| Name | Value | Notes |
|------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | From Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | From Supabase → Settings → API (anon public) |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Use your **Vercel deployment URL** (e.g. `https://slot-time-xxx.vercel.app`) — you can change this after first deploy |
| `RESEND_API_KEY` | `re_xxxx` | From [resend.com](https://resend.com) (needed for all emails) |
| `EMAIL_FROM` | `Slot Time <onboarding@resend.dev>` | Sender for emails (use your domain in production) |
| `CRON_SECRET` | (random string) | e.g. `openssl rand -hex 24` — used to secure the reminder cron endpoint |

- For **production**, add these to **Production** (and optionally to Preview if you want).
- After the first deploy, set `NEXT_PUBLIC_APP_URL` to your real URL (e.g. custom domain) and redeploy.

---

## 4. Deploy

1. Click **Deploy**.
2. Wait for the build to finish. The first URL will be like `https://slot-time-app-xxx.vercel.app`.
3. Open that URL and test:
   - Homepage loads
   - `/admin/login` — request magic link
   - Create an event and open `/e/your-slug`

---

## 5. Supabase redirect URLs

So magic-link login works from your Vercel URL:

1. In **Supabase** → **Authentication** → **URL Configuration** → **Redirect URLs**, add:
   - `https://your-app.vercel.app/**`
   - (and your custom domain if you add one later)
2. Save.

---

## 6. Reminder emails (cron)

Reminders (1 day, 30 min, 15 min before a slot) need the cron endpoint to be called **every 5–15 minutes**.

**Option A – Free: external cron**

1. Go to [cron-job.org](https://cron-job.org) (free account).
2. Create a cron job:
   - **URL:** `https://your-app.vercel.app/api/cron/reminders?secret=YOUR_CRON_SECRET`
   - **Schedule:** every 10 minutes (or every 5).
   - Save.

**Option B – Vercel Cron (Pro)**

If you use Vercel Pro, you can add a cron in the project:

1. In the repo, create or update `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

2. In Vercel → Project → **Settings** → **Environment Variables**, ensure `CRON_SECRET` is set.  
   Vercel will send the request with the correct `CRON_SECRET` header; your API can validate it (you may need to allow the header in your route if you use it).

For the current API that uses `?secret=`, you’d call the URL with the query param. Vercel Cron sends a GET request; you can use a rewrite or keep using an external cron that calls `GET ...?secret=...`.

So for **free**, use **Option A** (cron-job.org).

---

## 7. Optional: custom domain

1. In Vercel → Project → **Settings** → **Domains**, add your domain.
2. Update **Supabase** redirect URLs and `NEXT_PUBLIC_APP_URL` to that domain.
3. Redeploy if needed.

---

## Summary

- **App:** Vercel (GitHub → Vercel, env vars, Deploy).
- **DB/Auth:** Supabase (redirect URLs set).
- **Emails:** Resend (`RESEND_API_KEY`, `EMAIL_FROM`).
- **Reminders:** cron-job.org calling `/api/cron/reminders?secret=CRON_SECRET` every 10 minutes.

If something fails, check Vercel’s **Deployments** → **Functions** and **Supabase** logs.
