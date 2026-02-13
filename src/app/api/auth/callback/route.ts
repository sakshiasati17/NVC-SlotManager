import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (!code) {
    const base = new URL(request.url).origin;
    const url = new URL("/login", base);
    url.searchParams.set("error", "no_code");
    return NextResponse.redirect(url);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Auth] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment");
    const base = new URL(request.url).origin;
    const url = new URL("/login", base);
    url.searchParams.set("error", "config");
    return NextResponse.redirect(url);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[Auth] exchangeCodeForSession failed:", error.message, { code: code?.slice(0, 20) });
    const base = new URL(request.url).origin;
    const to = next.startsWith("/admin") ? "/admin/login" : "/login";
    const url = new URL(to, base);
    url.searchParams.set("error", "signin_failed");
    return NextResponse.redirect(url);
  }

  const origin = new URL(request.url).origin;
  const destination = next.startsWith("/") ? `${origin}${next}` : `${origin}/${next}`;
  return NextResponse.redirect(destination);
}
