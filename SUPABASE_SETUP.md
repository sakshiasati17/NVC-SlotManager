# Supabase setup — step by step

Do this **once** for your project: [https://supabase.com/dashboard](https://supabase.com/dashboard) → open your project.

---

## Step 1: Run the database migration

1. In the left sidebar click **SQL Editor**.
2. Click **New query**.
3. Open the file `supabase/RUN_THIS_IN_SUPABASE.sql` from this repo, copy **all** of its contents, and paste into the query box.
4. Click **Run** (or press Cmd/Ctrl + Enter).
5. You should see “Success. No rows returned.” That means the tables, RLS, and swap function are created.

---

## Step 2: Enable Email auth (for admin login)

1. In the left sidebar click **Authentication**.
2. Click **Providers**.
3. Click **Email**.
4. Turn **Enable Email provider** **ON**.
5. (Optional) Under **Confirm email**, turn it **ON** (recommended) so first-time sign-ins get a verification email to confirm the address is real if you want magic-link-only login without “confirm your email” first.
6. Click **Save**.
7. **Google / Microsoft (optional):** Under **Providers**, enable **Google** and/or **Azure** (Microsoft/Outlook) with your OAuth client ID and secret from Google Cloud Console or Azure AD. Save.

---

## Step 2b: Google & Microsoft OAuth on Vercel (production)

If **Sign in with Google** or **Microsoft / Outlook** works on localhost but not on [nvc-slot-manager.vercel.app](https://nvc-slot-manager.vercel.app), do the following.

### Supabase

1. **Authentication** → **URL Configuration**
2. **Site URL:** Set to `https://nvc-slot-manager.vercel.app` (so Supabase uses your production URL for OAuth redirects).
3. **Redirect URLs:** Must include `https://nvc-slot-manager.vercel.app/**` (you can keep `http://localhost:3000/**` for local dev).
4. Save.

### Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com) → your project → **APIs & Services** → **Credentials**.
2. Open your **OAuth 2.0 Client ID** (Web application) used by Supabase.
3. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000`
   - `https://nvc-slot-manager.vercel.app`
4. Under **Authorized redirect URIs**, keep exactly:
   - `https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback`  
   (Find your project ref in Supabase → Project Settings → API → Project URL; it’s the subdomain, e.g. `abcdefghijk` in `https://abcdefghijk.supabase.co`.)
5. Save. Changes can take a few minutes to apply.

### Microsoft Azure (for Outlook / Microsoft sign-in)

1. Go to [Azure Portal](https://portal.azure.com) → **App registrations** → your app used by Supabase.
2. **Authentication** → under **Web** (or **Single-page application**), add:
   - **Redirect URI:** `https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback`  
   (same Supabase callback as above; use the exact value Supabase shows in **Authentication** → **Providers** → **Azure**.)
3. Under **Implicit grant and hybrid flows**, if you use PKCE you may not need tokens; otherwise ensure **ID tokens** is checked if Supabase requires it.
4. Save.

### Vercel

- In **Project** → **Settings** → **Environment Variables**, set **NEXT_PUBLIC_APP_URL** = `https://nvc-slot-manager.vercel.app` for **Production**, then redeploy so the app uses this URL for OAuth redirects.

---

## Step 3: Allow redirect to your app (for magic link)

1. Still under **Authentication**, click **URL Configuration**.
2. Under **Redirect URLs**, click **Add URL** and add:
   - For local dev: `http://localhost:3000/**`
   - For production (Vercel): `https://nvc-slot-manager.vercel.app/**` (or your Vercel/custom domain, e.g. `https://your-domain.com/**`)
3. You can have both localhost and production URLs; Supabase will use the one that matches the request.
4. The app callback is `/api/auth/callback`. Ensure your app origin is in the redirect list.
5. **Session duration:** Under **Authentication** → **Settings** (or **JWT**), default **JWT expiry** is 3600 (1 hour). Admins stay signed in at least that long; increase if you want longer sessions.
6. Click **Save**.

---

## Step 4: Confirm it worked

1. Run your app: `npm run dev`.
2. Open http://localhost:3000/admin/login.
3. Enter your email and click “Send magic link”.
4. You should land on the admin dashboard and stay signed in (default at least 1 hour).
5. Create an event and add slots. Then open `/e/your-slug` and test signup.

If anything errors (e.g. in SQL Editor or when logging in), note the exact message and we can fix it.

---

## Troubleshooting

### "Could not find the table 'public.signup_verifications' in the schema cache"

This happens when a participant clicks **Confirm my email & sign up** and the `signup_verifications` table was never created (e.g. an older migration was run, or only part of the main SQL).

**Fix:** In Supabase → **SQL Editor** → New query, paste and run the contents of **`supabase/migrations/004_signup_verifications.sql`** from this repo. That creates the table, indexes, RLS, and the `get_signup_verification` / `complete_signup_verification` functions. Then try the signup again.

Alternatively, run the full **`supabase/RUN_THIS_IN_SUPABASE.sql`** script (it includes this table and is safe to re-run).
