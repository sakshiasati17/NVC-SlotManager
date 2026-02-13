"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

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

  useEffect(() => {
    const next = searchParams.get("next") ?? "/";
    const codeFromQuery = searchParams.get("code");
    const codeFromHash = getCodeFromHash();
    const code = codeFromQuery || codeFromHash;

    if (code) {
      const supabase = createClient();
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          const to = next.startsWith("/admin") ? "/admin/login" : "/login";
          router.replace(`${to}?error=signin_failed`);
          setStatus("done");
        } else {
          router.replace(next);
          setStatus("done");
        }
      });
      return;
    }

    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace(next);
        setStatus("done");
      } else {
        const to = next.startsWith("/admin") ? "/admin/login" : "/login";
        router.replace(`${to}?error=no_code`);
        setStatus("done");
      }
    });
  }, [router, searchParams]);

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
