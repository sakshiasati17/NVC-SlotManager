# Where to get each environment variable

Use these values in **Vercel → Project → Settings → Environment Variables** (and in `.env.local` for local development).

---

## 1. NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

**From Supabase**

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Open your project (or create one).
3. Click **Project Settings** (gear icon in the left sidebar).
4. Click **API** in the left menu.
5. On that page you’ll see:
   - **Project URL** → use this as `NEXT_PUBLIC_SUPABASE_URL`  
     (e.g. `https://abcdefghijk.supabase.co`)
   - **Project API keys** → under “anon” / “public”:
     - **anon public** key → use this as `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
       (long string starting with `eyJ...`)

Use the **anon public** key only, not the “service_role” key.

---

## 2. NEXT_PUBLIC_APP_URL

**Your app’s public URL**

- **First deploy:** Use the URL Vercel gives you after deploy, e.g.  
  `https://your-project-name.vercel.app`  
  (you’ll see it in the Vercel dashboard after the first successful deploy).
- **Later:** If you add a custom domain (e.g. `https://slots.yourdomain.com`), set `NEXT_PUBLIC_APP_URL` to that and redeploy.

So: **NEXT_PUBLIC_APP_URL** = the URL where your app is running (Vercel URL or your custom domain).

---

## 3. RESEND_API_KEY

**From Resend (email sending)**

1. Go to [resend.com](https://resend.com) and sign up or sign in.
2. Open **API Keys** (in the dashboard or under **Settings**).
3. Create an API key (e.g. “Vercel production”).
4. Copy the key (it usually starts with `re_`).  
   That value is **RESEND_API_KEY**.

You only see the full key once when you create it — paste it into Vercel env vars right away.

---

## 4. EMAIL_FROM

**Sender address for emails**

- **Testing:** You can use Resend’s default:  
  `Slot Time <onboarding@resend.dev>`  
  (only works for sending to the email you used for the Resend account).
- **Production:** After you add and verify your own domain in Resend, use something like:  
  `Slot Time <noreply@yourdomain.com>`  
  or any address at your verified domain.

So: **EMAIL_FROM** = the “From” name and email you want on reminder and confirmation emails.

---

## 5. CRON_SECRET

**You create this yourself** (a secret password for the reminder cron)

- **Option A – Terminal:**  
  ```bash
  openssl rand -hex 24
  ```  
  Use the long string it prints as **CRON_SECRET** (e.g. `a1b2c3d4e5...`).
- **Option B:** Use any long random string (e.g. 32+ characters). Don’t reuse a password you use elsewhere.

Then:

1. Put that same value in **Vercel** as the **CRON_SECRET** env var.
2. When you set up the external cron (e.g. [cron-job.org](https://cron-job.org)), call:  
   `https://your-app.vercel.app/api/cron/reminders?secret=THAT_SAME_VALUE`

So: **CRON_SECRET** = a secret you create once, store in Vercel, and pass as `?secret=...` when calling the reminders API.

---

## Quick reference

| Variable | Where you get it |
|----------|------------------|
| **NEXT_PUBLIC_SUPABASE_URL** | Supabase → Project Settings → API → **Project URL** |
| **NEXT_PUBLIC_SUPABASE_ANON_KEY** | Supabase → Project Settings → API → **anon public** key |
| **NEXT_PUBLIC_APP_URL** | Your Vercel app URL (e.g. `https://xxx.vercel.app`) or your custom domain |
| **RESEND_API_KEY** | Resend dashboard → API Keys → create and copy key |
| **EMAIL_FROM** | `Slot Time <onboarding@resend.dev>` for testing, or your domain later |
| **CRON_SECRET** | You create it (e.g. `openssl rand -hex 24`) and use the same value in Vercel and in the cron URL |

Add all of these in **Vercel → your project → Settings → Environment Variables**, then redeploy.
