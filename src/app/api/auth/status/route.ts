import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** Force this route to be dynamic so it is always available (avoids 404 on some hosts). */
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/status – Check if auth is configured and Supabase is reachable.
 * Use this to debug "nobody can login or signup". Returns 200 with { ok, reason }.
 * Do not expose secrets; only reports whether env is set and Supabase responds.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({
      ok: false,
      reason: "missing_env",
      message: "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Add them in Vercel → Settings → Environment Variables and redeploy.",
    });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getSession();
    if (error) {
      return NextResponse.json({
        ok: false,
        reason: "supabase_error",
        message: `Supabase returned: ${error.message}. Check your anon key and Supabase project.`,
      });
    }
    return NextResponse.json({
      ok: true,
      reason: "ready",
      message: "Auth env is set and Supabase is reachable. If login/signup still fails, check SUPABASE_AUTH_SETUP.md (redirect URLs, Email provider, etc.).",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({
      ok: false,
      reason: "error",
      message: `Auth check failed: ${message}`,
    });
  }
}
