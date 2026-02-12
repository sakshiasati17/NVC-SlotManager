"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const redirectTo = () => {
  if (typeof window === "undefined") return "";
  const origin = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
  return `${origin}/api/auth/callback?next=/admin`;
};

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isSignUp && password !== confirmPassword) {
      setError("Passwords don’t match.");
      return;
    }
    if (isSignUp && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    if (isSignUp) {
      const { data, error: err } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (err) {
        setError(err.message);
        return;
      }
      if (data?.session) {
        router.push("/admin");
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
      setError(err.message);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  async function handleMagicLink() {
    if (!email?.trim()) {
      setError("Enter your email first.");
      return;
    }
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo() || (typeof window !== "undefined" ? window.location.origin : "") + "/admin" },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setMagicLinkSent(true);
  }

  async function handleOAuth(provider: "google" | "azure") {
    setError(null);
    setOauthLoading(provider);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo() },
    });
    setOauthLoading(null);
    if (err) setError(err.message);
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

      {/* Google & Microsoft */}
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

      {/* Sign in / Sign up with email + password */}
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
