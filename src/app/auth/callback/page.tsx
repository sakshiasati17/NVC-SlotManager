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

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [noCodeDebug, setNoCodeDebug] = useState<{ url: string; origin: string } | null>(null);
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const next = searchParams.get("next") ?? "/";
    const codeFromQuery = searchParams.get("code");
    const codeFromHash = getCodeFromHash();
    const code = codeFromQuery || codeFromHash;

    const toLogin = (err: string, showDebug?: boolean) => {
      if (showDebug && typeof window !== "undefined") {
        setNoCodeDebug({ url: window.location.href, origin: window.location.origin });
        setStatus("done");
      }
      const to = next.startsWith("/admin") ? "/admin/login" : "/login";
      if (!showDebug) router.replace(`${to}?error=${err}`);
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
