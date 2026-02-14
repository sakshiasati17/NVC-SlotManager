"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

/** Parse code from URL hash (Supabase sometimes puts code in fragment so server never sees it). */
function getCodeFromHash(): string | null {
  if (typeof window === "undefined" || !window.location.hash) return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get("code");
}

/** Parse error info from URL query string OR hash (Supabase sends errors in both). */
function getErrorInfo(searchParams: URLSearchParams): { error: string; description: string } | null {
  // Check query string first
  let error = searchParams.get("error");
  let description = searchParams.get("error_description");

  // Also check hash fragment (Supabase may duplicate errors there)
  if (!error && typeof window !== "undefined" && window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    error = hashParams.get("error");
    description = hashParams.get("error_description");
  }

  if (!error) return null;
  return { error, description: description || error };
}

/** Turn Supabase error descriptions into user-friendly messages. */
function friendlyErrorMessage(description: string): string {
  const lower = description.toLowerCase();

  if (lower.includes("unable to exchange external code")) {
    return "Microsoft / Azure sign-in failed: Supabase could not exchange the authorization code from Microsoft. This usually means the Azure client secret in Supabase is expired or wrong. Go to Supabase → Authentication → Providers → Azure and update the Client Secret with a new one from Azure App Registration → Certificates & secrets.";
  }
  if (lower.includes("provider is not enabled")) {
    return "This sign-in provider is not enabled. Go to Supabase → Authentication → Providers and enable it.";
  }
  if (lower.includes("redirect") || lower.includes("mismatch")) {
    return "Redirect URL mismatch. Make sure your app URL (with /**) is listed in Supabase → Authentication → URL Configuration → Redirect URLs.";
  }

  // Default: show the raw description
  return description;
}

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [errorInfo, setErrorInfo] = useState<{ message: string; raw: string } | null>(null);
  const [noCodeDebug, setNoCodeDebug] = useState<{ url: string; origin: string } | null>(null);
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const next = searchParams.get("next") ?? "/";
    const loginPage = next.startsWith("/admin") ? "/admin/login" : "/login";

    // ── 1. Check for error params from Supabase (OAuth failure) ──
    const supabaseError = getErrorInfo(searchParams);
    if (supabaseError) {
      const message = friendlyErrorMessage(supabaseError.description);
      setErrorInfo({ message, raw: supabaseError.description });
      setStatus("error");
      return;
    }

    // ── 2. Try to exchange auth code for session ──
    const codeFromQuery = searchParams.get("code");
    const codeFromHash = getCodeFromHash();
    const code = codeFromQuery || codeFromHash;

    const toLogin = (err: string, showDebug?: boolean) => {
      if (showDebug && typeof window !== "undefined") {
        setNoCodeDebug({ url: window.location.href, origin: window.location.origin });
        setStatus("done");
      }
      if (!showDebug) router.replace(`${loginPage}?error=${err}`);
    };

    if (code) {
      const supabase = createClient();
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            toLogin("signin_failed");
          } else {
            router.replace(next);
            setStatus("done");
          }
        })
        .catch(() => toLogin("signin_failed"));
      return;
    }

    // ── 3. No code – maybe session already exists ──
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace(next);
        setStatus("done");
      } else {
        toLogin("no_code", true);
      }
    });
  }, [router, searchParams]);

  // ── Error from Supabase (e.g. Azure code exchange failure) ──
  if (errorInfo) {
    const loginPage = searchParams.get("next")?.startsWith("/admin") ? "/admin/login" : "/login";
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-4 text-center">
        <p className="text-[var(--foreground)] font-medium mb-2">Sign-in failed</p>
        <p className="text-sm text-red-600 mb-4 max-w-lg">
          {errorInfo.message}
        </p>
        <details className="text-xs text-[var(--muted)] mb-4 max-w-lg">
          <summary className="cursor-pointer hover:underline">Technical details</summary>
          <p className="mt-1 break-all">{errorInfo.raw}</p>
        </details>
        <a
          href={loginPage}
          className="text-sm text-[var(--accent)] hover:underline"
        >
          ← Back to login
        </a>
      </div>
    );
  }

  // ── No code received (redirect URL not configured) ──
  if (noCodeDebug) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-4 text-center">
        <p className="text-[var(--foreground)] font-medium mb-2">No sign-in code received</p>
        <p className="text-sm text-[var(--muted)] mb-4">
          Add this <strong>exact</strong> URL to Supabase → Authentication → URL Configuration → Redirect URLs:
        </p>
        <p className="text-sm font-mono bg-[var(--card)] border border-[var(--card-border)] rounded px-3 py-2 mb-4 break-all">
          {noCodeDebug.origin}/**
        </p>
        <p className="text-xs text-[var(--muted)] mb-4 max-w-md">
          You landed at: <span className="break-all">{noCodeDebug.url}</span>
        </p>
        <a
          href={`/login?error=no_code`}
          className="text-sm text-[var(--accent)] hover:underline"
        >
          Back to login
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <p className="text-[var(--muted)]">
        {status === "loading" ? "Signing you in…" : "Redirecting…"}
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <p className="text-[var(--muted)]">Signing you in…</p>
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  );
}
