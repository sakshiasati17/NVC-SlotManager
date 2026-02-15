import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  // Supabase may return error params instead of a code (e.g. Azure OAuth failure)
  const errorParam = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");
  if (errorParam) {
    const to = next.startsWith("/admin") ? "/admin/login" : "/login";
    const url = new URL(to, origin);
    url.searchParams.set("error", "signin_failed");
    if (errorDesc) url.searchParams.set("detail", errorDesc.slice(0, 200));
    return NextResponse.redirect(url);
  }

  if (!code) {
    const to = next.startsWith("/admin") ? "/admin/login" : "/login";
    const url = new URL(to, origin);
    url.searchParams.set("error", "no_code");
    return NextResponse.redirect(url);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Auth] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment");
    const url = new URL("/login", origin);
    url.searchParams.set("error", "config");
    return NextResponse.redirect(url);
  }

  // Build redirect destination
  const destination = next.startsWith("/") ? `${origin}${next}` : `${origin}/${next}`;
  const redirectResponse = NextResponse.redirect(destination);

  // Create Supabase client that reads/writes cookies ON the response object.
  // This is critical: cookies must be set on the SAME response that does the redirect.
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          // Read cookies from the incoming request
          const cookieHeader = request.headers.get("cookie") ?? "";
          return cookieHeader.split(";").map((c) => {
            const [name, ...rest] = c.trim().split("=");
            return { name: name ?? "", value: rest.join("=") };
          }).filter((c) => c.name);
        },
        setAll(cookiesToSet) {
          // Write cookies onto the redirect response so the browser receives them
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[Auth] exchangeCodeForSession failed:", error.message, { code: code?.slice(0, 20) });
    const to = next.startsWith("/admin") ? "/admin/login" : "/login";
    const url = new URL(to, origin);
    url.searchParams.set("error", "signin_failed");
    return NextResponse.redirect(url);
  }

  // Return the redirect response with auth cookies attached
  return redirectResponse;
}
