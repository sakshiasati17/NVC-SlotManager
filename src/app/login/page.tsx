import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ParticipantLoginForm } from "./participant-login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; slot?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { redirect: redirectTo, slot } = await searchParams;

  if (user) {
    const dest = redirectTo && redirectTo.startsWith("/")
      ? redirectTo + (slot ? (redirectTo.includes("?") ? `&slot=${slot}` : `?slot=${slot}`) : "")
      : "/my-bookings";
    redirect(dest);
  }

  const fullRedirect =
    redirectTo && redirectTo.startsWith("/")
      ? redirectTo + (slot ? (redirectTo.includes("?") ? `&slot=${slot}` : `?slot=${slot}`) : "")
      : "/my-bookings";

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-4 py-8">
      <div id="main" className="w-full max-w-sm rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] p-5 sm:p-6 shadow-[var(--shadow-lg)]" tabIndex={-1}>
        <h1 className="text-xl font-semibold text-[var(--foreground)] mb-2">Sign in / Sign up</h1>
        <p className="text-sm text-[var(--muted)] mb-6">
          Anyone can sign in or create an account to book event slots and manage their bookings. Use Google, Microsoft, or email. You’ll only see your own details.
        </p>
        <ParticipantLoginForm redirectTo={fullRedirect} />
        <p className="mt-4 text-center">
          <Link href={redirectTo || "/"} className="inline-block text-sm text-[var(--accent)] hover:underline py-2 min-h-[44px] flex items-center justify-center">
            ← Back
          </Link>
        </p>
      </div>
    </div>
  );
}
