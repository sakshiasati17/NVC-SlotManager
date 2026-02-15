"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ParticipantLoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = redirectTo.startsWith("/") ? redirectTo : `/${redirectTo}`;
  const callbackUrl = () => {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    // Client callback reads code from query OR hash (Supabase may use either).
    return `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const err = searchParams.get("error");
    const detail = searchParams.get("detail");
    if (err === "signin_failed") {
      const extra = detail ? ` (${detail})` : "";
      setError(`Sign-in with Google or Microsoft did not complete${extra}. Try again or use email/password / magic link.`);
    } else if (err === "no_code") {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectHint = origin
        ? `Add this URL in Supabase → Authentication → URL Configuration → Redirect URLs: ${origin}/**`
        : "Add your app URL (e.g. https://nvc-slot-manager.vercel.app/**) to Redirect URLs.";
      setError(`No sign-in code received. ${redirectHint} See SUPABASE_AUTH_SETUP.md.`);
    } else if (err === "config") {
      setError("Auth is not configured for this site. Please contact the administrator.");
    }
  }, [searchParams]);

  async function handleEmailPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isSignUp && password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (isSignUp && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      if (isSignUp) {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        setLoading(false);
        if (err) {
          const msg = err.message.toLowerCase();
          const hint = msg.includes("signup") && msg.includes("disabled")
            ? "Signup is disabled. Ask the site admin to enable Email provider in Supabase → Authentication → Providers → Email."
            : msg.includes("invalid") && (msg.includes("key") || msg.includes("api"))
              ? "Auth configuration error. Check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Vercel (see SUPABASE_AUTH_SETUP.md)."
              : err.message;
          setError(hint);
          return;
        }
        if (data?.session) {
          router.push(nextPath);
          router.refresh();
          return;
        }
        setError(null);
        setSignUpSuccess(true);
        setIsSignUp(false);
        setPassword("");
        setConfirmPassword("");
        return;
      }
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (err) {
        const msg = err.message.toLowerCase().includes("invalid login credentials")
          ? "No account with this email and password. Try Sign up to create one, or use Google / Microsoft / magic link below."
          : err.message;
        setError(msg);
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Sign in failed. See SUPABASE_AUTH_SETUP.md or contact the site admin.");
    }
  }

  async function handleMagicLink() {
    if (!email?.trim()) {
      setError("Enter your email first.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: callbackUrl() || (typeof window !== "undefined" ? window.location.origin : "") + nextPath },
      });
      setLoading(false);
      if (err) {
        const msg = err.message.toLowerCase();
        const hint = msg.includes("signup") && msg.includes("disabled")
          ? "Signup is disabled. Ask the site admin to enable Email provider in Supabase → Authentication → Providers → Email."
          : msg.includes("invalid") && (msg.includes("key") || msg.includes("api"))
            ? "Auth configuration error. Check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Vercel (see SUPABASE_AUTH_SETUP.md)."
            : err.message;
        setError(hint);
        return;
      }
      setMagicLinkSent(true);
    } catch (err) {
      setLoading(false);
      const raw = err instanceof Error ? err.message : "Could not send magic link. See SUPABASE_AUTH_SETUP.md.";
      const msg = raw.toLowerCase();
      const hint = msg.includes("signup") && msg.includes("disabled")
        ? "Signup is disabled. Ask the site admin to enable Email provider in Supabase → Authentication → Providers → Email."
        : msg.includes("invalid") && (msg.includes("key") || msg.includes("api"))
          ? "Auth configuration error. Check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Vercel (see SUPABASE_AUTH_SETUP.md)."
          : raw;
      setError(hint);
    }
  }

  async function handleOAuth(provider: "google" | "azure") {
    setError(null);
    setOauthLoading(provider);
    try {
      const supabase = createClient();
      const oauthOptions: Record<string, unknown> = { redirectTo: callbackUrl() };
      // Azure needs explicit scopes to return user email
      if (provider === "azure") {
        oauthOptions.scopes = "openid email profile";
      }
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: oauthOptions,
      });
      setOauthLoading(null);
      if (err) {
        const msg = err.message.toLowerCase();
        const hint = msg.includes("signup") && msg.includes("disabled")
          ? "Signup is disabled. Ask the site admin to enable Email provider in Supabase → Authentication → Providers → Email."
          : msg.includes("invalid") && (msg.includes("key") || msg.includes("api"))
            ? "Auth configuration error. Check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Vercel (see SUPABASE_AUTH_SETUP.md)."
            : err.message;
        setError(hint);
      }
    } catch (err) {
      setOauthLoading(null);
      const raw = err instanceof Error ? err.message : "Could not start sign-in. See SUPABASE_AUTH_SETUP.md.";
      const msg = raw.toLowerCase();
      const hint = msg.includes("signup") && msg.includes("disabled")
        ? "Signup is disabled. Ask the site admin to enable Email provider in Supabase → Authentication → Providers → Email."
        : msg.includes("invalid") && (msg.includes("key") || msg.includes("api"))
          ? "Auth configuration error. Check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Vercel (see SUPABASE_AUTH_SETUP.md)."
          : raw;
      setError(hint);
    }
  }

  if (magicLinkSent) {
    return (
      <p className="text-sm text-[var(--success)]">
        Check your email for the sign-in link.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!!oauthLoading}
          onClick={() => handleOAuth("google")}
          className="flex items-center justify-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card)] disabled:opacity-50 transition-colors"
        >
          {oauthLoading === "google" ? "…" : "Google"}
        </button>
        <button
          type="button"
          disabled={!!oauthLoading}
          onClick={() => handleOAuth("azure")}
          className="flex items-center justify-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card)] disabled:opacity-50 transition-colors"
        >
          {oauthLoading === "azure" ? "…" : "Microsoft / Outlook"}
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[var(--card-border)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase text-[var(--muted)]">
          <span className="bg-[var(--card)] px-2">or</span>
        </div>
      </div>

      <div className="space-y-3">
        {signUpSuccess && (
          <p className="text-sm text-[var(--success)]">
            Check your email to verify your account. After verifying, sign in with your email and password below.
          </p>
        )}
        <div className="flex gap-2 border-b border-[var(--card-border)]">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(null); }}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${!isSignUp ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--muted)]"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(null); }}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${isSignUp ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--muted)]"}`}
          >
            Sign up
          </button>
        </div>
        <form onSubmit={handleEmailPassword} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
          />
          <input
            type="password"
            placeholder={isSignUp ? "Password (min 6 characters)" : "Password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
          />
          {isSignUp && (
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
            />
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--accent)] text-white font-medium py-2 text-sm hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
          >
            {loading ? "…" : isSignUp ? "Sign up" : "Sign in"}
          </button>
        </form>
        <p className="text-xs text-[var(--muted)]">
          Or{" "}
          <button type="button" onClick={() => handleMagicLink()} className="text-[var(--accent)] hover:underline">
            get a one-time link by email
          </button>
        </p>
      </div>
    </div>
  );
}
