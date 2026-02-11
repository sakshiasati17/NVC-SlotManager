"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ParticipantLoginForm({ redirectTo }: { redirectTo: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const path = redirectTo.startsWith("/") ? redirectTo : `/${redirectTo}`;
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}${path}` },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p className="text-sm text-[var(--success)]">
        Check your email for the sign-in link. Click it to continue.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
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
        {loading ? "Sending…" : "Send sign-in link"}
      </button>
    </form>
  );
}
