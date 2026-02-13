# Supabase Auth – Production login & signup (Vercel)

If **nobody can log in or sign up** (email/password, Google, or Microsoft), work through this list. Auth is handled by Supabase; the app only sends the right URLs and shows errors.

**If both login and signup fail:** Usually the app cannot reach Supabase or the keys are wrong. Check **§1** (Vercel env vars) and **§8** (Email provider enabled) first.

---

## 1. Vercel environment variables (required)

In **Vercel → Project → Settings → Environment Variables**, set these for **Production** (and redeploy after changing):

| Variable | Example | Notes |
|----------|---------|--------|
| **NEXT_PUBLIC_SUPABASE_URL** | `https://xxxxx.supabase.co` | From Supabase → Project Settings → API |
| **NEXT_PUBLIC_SUPABASE_ANON_KEY** | `eyJhbGc...` | Same page, “anon” / “public” key |
| **NEXT_PUBLIC_APP_URL** | `https://nvc-slot-manager.vercel.app` | Your production URL (used for auth redirects) |

If **NEXT_PUBLIC_APP_URL** is wrong or missing, the redirect URL sent to Supabase may not match your allow list and login will fail.

---

## 2. Supabase – URL configuration (required)

In **Supabase Dashboard → Authentication → URL Configuration**:

1. **Site URL**  
   Set to your production URL, e.g.:
   ```text
   https://nvc-slot-manager.vercel.app
   ```

2. **Redirect URLs**  
   Add every URL where Supabase may send users after login. For this app you need at least:
   ```text
   https://nvc-slot-manager.vercel.app/**
   ```
   or more specifically:
   ```text
   https://nvc-slot-manager.vercel.app/api/auth/callback
   ```
   Also keep localhost if you use it:
   ```text
   http://localhost:3000/**
   ```

Save. If the redirect URL the app sends does not match an entry here, Google/Microsoft login will fail or users will not return to your app.

---

## 3. Google OAuth (if using Google sign-in)

1. **Google Cloud Console** → your OAuth 2.0 Client (APIs & Services → Credentials).
2. **Authorized JavaScript origins** – add:
   ```text
   https://nvc-slot-manager.vercel.app
   ```
3. **Authorized redirect URIs** – add the **Supabase** callback (not your app URL), e.g.:
   ```text
   https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback
   ```
   Get the exact value from Supabase → Authentication → URL Configuration (or the “Callback URL” they show for providers).

---

## 4. Microsoft (Azure) OAuth – “I click Outlook, pick my CU id, then nothing happens”

If you click **Microsoft / Outlook**, choose your account, and then **nothing happens** (no redirect back, or you end up on a blank/wrong page), the redirect back to the app is failing. Fix these in order:

**A. Supabase redirect URLs (required)**  
In **Supabase → Authentication → URL Configuration → Redirect URLs**, add:
```text
https://nvc-slot-manager.vercel.app/**
```
(Use your real production URL.) Without this, Supabase will not send users back to your app after Microsoft signs them in.

**B. Azure redirect URI (required for Microsoft)**  
In **Azure Portal** → your App registration → **Authentication**:

1. Under **Platform configurations**, add **Web** if needed.
2. Under **Redirect URIs**, add **exactly** this (replace with your Supabase project ref):
   ```text
   https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback
   ```
   Get the exact value from **Supabase → Authentication → URL Configuration** (often shown as “Callback URL” for providers).  
   Do **not** use your app URL (e.g. `https://nvc-slot-manager.vercel.app/...`) here; Microsoft must redirect to **Supabase**, and Supabase then redirects to your app.

**C. Vercel – NEXT_PUBLIC_APP_URL**  
In **Vercel → Environment Variables**, set **NEXT_PUBLIC_APP_URL** to your production URL (e.g. `https://nvc-slot-manager.vercel.app`) for **Production**, then **redeploy**. The app uses this to tell Supabase where to send users after login; if it’s wrong or missing, the “back to app” step can break.

**D. Try again**  
Use **Microsoft / Outlook** again. After choosing your CU id, you should be redirected back to the app and signed in (or signed up, same as with email). If it still does nothing, try in an **incognito/private** window and check the browser address bar after clicking your account – you should end up on your app’s URL, not stuck on Microsoft or Supabase.

---

## 5. Email confirmation (email/password and magic link)

In **Supabase → Authentication → Providers → Email**:

- If **“Confirm email”** is ON, users must click the confirmation link before they can sign in.  
  - The link uses Supabase’s host. If you use a custom SMTP or redirect, it must point to your app or Supabase correctly.
- If you want to test without confirmation, you can turn **“Confirm email”** OFF (only for development/testing).

For **magic link**, the link in the email must open a URL that is in your Supabase **Redirect URLs** (e.g. your app’s `/api/auth/callback` or a page that then sends the token to Supabase).

---

## 6. Check Vercel logs when login fails

After a failed login (especially Google/Microsoft):

1. **Vercel → Project → Logs** (or Deployments → … → View Function Logs).
2. Look for:
   - `[Auth] exchangeCodeForSession failed: ...`  
     This is from the app when Supabase’s code exchange fails (wrong redirect, expired code, etc.).
   - Any Supabase or auth-related errors.

That message helps distinguish “redirect URL not allowed” from “code expired” or “wrong project”.

---

## 7. Quick checklist

- [ ] Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL` set for Production.
- [ ] Redeployed after changing env vars (so the new values are in the build).
- [ ] Supabase: **Site URL** = production URL.
- [ ] Supabase: **Redirect URLs** include `https://nvc-slot-manager.vercel.app/**` (or your domain).
- [ ] Google (if used): correct Supabase callback in “Authorized redirect URIs”.
- [ ] Azure (if used): same Supabase callback as “Web” redirect URI.
- [ ] If still failing: reproduce the login and check Vercel logs for `[Auth] exchangeCodeForSession failed`.

---

## 8. Email provider (required for signup & email login)

If **signup** or **email/password login** never works:

1. **Supabase Dashboard → Authentication → Providers**
2. Open **Email**
3. Ensure **“Enable Email provider”** is **ON**
4. For testing, you can turn **“Confirm email”** **OFF** so users can sign in right after signup without clicking a link. (Turn it back on for production if you want confirmation.)
5. Save

If the Email provider is disabled, both signup and sign-in with email/password will fail (often with a generic or confusing error).

---

## 9. Neither login nor signup works – checklist

- [ ] **Vercel:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set for **Production** and you **redeployed** after adding/changing them.
- [ ] **Supabase:** Authentication → Providers → **Email** is **enabled**.
- [ ] **Supabase:** URL Configuration has **Site URL** and **Redirect URLs** set (§2).
- [ ] Try **Sign up** with a new email and password (min 6 characters). If you see a network error or “Invalid API key”, the Supabase URL or anon key in Vercel is wrong or missing.
- [ ] In the browser dev tools (Network tab), when you click Sign up or Sign in, check whether the request goes to `https://xxxxx.supabase.co/auth/v1/...` and what status/response it returns.

**Quick check:** Open `https://your-app.vercel.app/api/auth/status` in the browser. It returns JSON:
- `ok: true` – env is set and Supabase is reachable; if login/signup still fails, check redirect URLs and Email provider.
- `ok: false`, `reason: "missing_env"` – add the Supabase env vars in Vercel and redeploy.
- `ok: false`, `reason: "supabase_error"` – check your anon key and Supabase project.

After these are correct, login and signup should work in production.
