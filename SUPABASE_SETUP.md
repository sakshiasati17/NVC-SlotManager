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

## Step 3: Allow redirect to your app (for magic link)

1. Still under **Authentication**, click **URL Configuration**.
2. Under **Redirect URLs**, click **Add URL** and add:
   - For local dev: `http://localhost:3000/**`
   - For production (when you deploy): `https://your-domain.com/**`
3. The app callback is `/api/auth/callback`. Ensure your app origin is in the redirect list.
4. **Session duration:** Under **Authentication** → **Settings** (or **JWT**), default **JWT expiry** is 3600 (1 hour). Admins stay signed in at least that long; increase if you want longer sessions.
5. Click **Save**.

---

## Step 4: Confirm it worked

1. Run your app: `npm run dev`.
2. Open http://localhost:3000/admin/login.
3. Enter your email and click “Send magic link”.
4. You should land on the admin dashboard and stay signed in (default at least 1 hour).
5. Create an event and add slots. Then open `/e/your-slug` and test signup.

If anything errors (e.g. in SQL Editor or when logging in), note the exact message and we can fix it.
