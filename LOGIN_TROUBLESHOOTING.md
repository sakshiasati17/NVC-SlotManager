# Login troubleshooting – "Invalid login credentials"

**"Invalid login credentials"** comes from Supabase Auth. It usually means one of the following.

---

## 1. Email + password: no account yet

If you use **Sign in** with email and password but **never signed up**, Supabase returns this error.

**Fix:**
- Click **Sign up** (tab next to Sign in), enter email + password (min 6 characters), and submit. Then check your email and confirm if required.
- Or use **Google** or **Microsoft** to sign in (no password needed).
- Or use **"Get a one-time link by email"** – enter your email, then click the link we send you.

**Important:** Being in the "allowed admins" list does **not** create an account. You still need to sign in once (Sign up, Google, Microsoft, or magic link). After that, the app checks allowed_admins only for **admin** access.

---

## 2. Wrong email or password

- **Password:** If you signed up with email/password, use that exact password. There is no "forgot password" in the app yet; use **"Get a one-time link by email"** or **Google/Microsoft** instead.
- **Different emails:** `leah.shafer@colorado.edu` and `shaferl@colorado.edu` are **different accounts**. Sign in with the email you used when you first signed up.

---

## 3. Google or Microsoft sign-in not working (production)

If you click **Google** or **Microsoft** and get an error or end up back on login:

**Supabase (required):**
1. **Authentication → URL Configuration**
   - **Site URL:** set to your production URL, e.g. `https://nvc-slot-manager.vercel.app`
   - **Redirect URLs:** add `https://nvc-slot-manager.vercel.app/**` (and `http://localhost:3000/**` for local)

**Google:**
2. In **Google Cloud Console** → your OAuth 2.0 Client:
   - **Authorized JavaScript origins:** add `https://nvc-slot-manager.vercel.app`
   - **Authorized redirect URIs:** add your Supabase callback, e.g. `https://<your-project-ref>.supabase.co/auth/v1/callback`  
     (find the exact URL in Supabase → Authentication → URL Configuration)

**Microsoft (Azure):**
3. In **Azure** → App registration → Authentication:
   - Add a **Web** redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`

**Vercel:**
4. **NEXT_PUBLIC_APP_URL** must be set to your production URL (e.g. `https://nvc-slot-manager.vercel.app`) so the app sends the correct callback URL to Supabase.

---

## 4. Quick checklist for your team

- **First time:** Use **Sign up** (email + password) or **Google** / **Microsoft**.
- **@colorado.edu:** Prefer **Google** (university Google account) so you don’t have to remember a separate password.
- **Admin:** After signing in, go to **Admin sign in** (or `/admin/login`). If your email is in the allowed list, you’ll see "All events". If not, you’ll see "Admin access requested" and staff get an email.
- **Participant:** Use the main **Sign in / Sign up** link on the homepage or from the event page.

---

## 5. If it still fails

- Try in an **incognito/private** window (to rule out old cookies).
- Try **magic link:** enter email → "Get a one-time link by email" → use the link from your inbox.
- Confirm **Supabase** → Authentication → Users: do you see the user after signing up? If not, sign-up or OAuth may be failing before the app (e.g. redirect or provider config).
