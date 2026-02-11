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

  if (user && redirectTo) {
    redirect(redirectTo + (slot ? `?slot=${slot}` : ""));
  }

  const fullRedirect =
    redirectTo && redirectTo.startsWith("/")
      ? redirectTo + (slot ? (redirectTo.includes("?") ? `&slot=${slot}` : `?slot=${slot}`) : "")
      : "/";

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-lg)]">
        <h1 className="text-xl font-semibold text-[var(--foreground)] mb-2">Sign in</h1>
        <p className="text-sm text-[var(--muted)] mb-6">
          We&apos;ll send you a link to sign in. Use it to sign up for a slot or manage your signup.
        </p>
        <ParticipantLoginForm redirectTo={fullRedirect} />
        <p className="mt-4 text-center">
          <Link href={redirectTo || "/"} className="text-sm text-[var(--accent)] hover:underline">
            ← Back
          </Link>
        </p>
      </div>
    </div>
  );
}
