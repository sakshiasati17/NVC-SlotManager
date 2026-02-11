"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const redirectTo = () =>
  typeof window !== "undefined"
    ? `${window.location.origin}/api/auth/callback?next=/admin`
    : "";

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() || `${typeof window !== "undefined" ? window.location.origin : ""}/admin` },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
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
    if (err) {
      setError(err.message);
    }
  }

  if (sent) {
    return (
      <p className="text-sm text-[var(--success)]">
        Check your email for the sign-in link.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* OAuth: Google & Microsoft (Outlook) */}
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

      {/* Email: first-time sign-in may send verification email */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-[var(--muted)]">First time using email? We’ll send a verification link to confirm your address.</p>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[var(--accent)] text-white font-medium py-2 hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
        >
          {loading ? "Sending…" : "Continue with email"}
        </button>
      </form>
    </div>
  );
}
