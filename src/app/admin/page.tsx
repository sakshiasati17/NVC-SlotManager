import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isAllowedAdmin } from "@/lib/admin-access";
import { adminAccessRequestNotification } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { AdminEventList } from "./admin-event-list";
import { AdminSignOut } from "./admin-sign-out";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { allowed, email } = await isAllowedAdmin();

  if (!allowed && email) {
    // Record request (idempotent: only send email if this is a new request)
    const { data: existing } = await supabase
      .from("admin_access_requests")
      .select("email")
      .ilike("email", email)
      .maybeSingle();

    await supabase.from("admin_access_requests").upsert(
      { email, requested_at: new Date().toISOString() },
      { onConflict: "email" }
    );

    const notifyTo = process.env.ADMIN_REQUEST_NOTIFY_EMAIL?.trim();
    if (!existing && notifyTo) {
      const { subject, html } = adminAccessRequestNotification({
        requesterEmail: email,
        requesterName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? undefined,
      });
      await sendEmail(notifyTo, subject, html);
    }

    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[var(--shadow-lg)] text-center">
          <h1 className="text-xl font-semibold text-[var(--foreground)] mb-2">Admin access requested</h1>
          <p className="text-sm text-[var(--muted)] mb-6">
            Your request for admin access has been sent to the Innovation &amp; Entrepreneurship staff. They will review it and grant access if appropriate. You will not be able to create or manage events until then.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/"
              className="inline-block rounded-lg bg-[var(--accent)] text-white font-medium px-4 py-2 hover:bg-[var(--accent-hover)]"
            >
              Back to home
            </Link>
            <Link
              href="/login"
              className="inline-block rounded-lg border border-[var(--card-border)] px-4 py-2 font-medium hover:bg-[var(--card)]"
            >
              Participant sign in
            </Link>
          </div>
          <p className="mt-6">
            <AdminSignOut />
          </p>
        </div>
      </div>
    );
  }

  const { data: myEvents } = await supabase
    .from("events")
    .select("id, title, slug, starts_at, created_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  const { data: roles } = await supabase
    .from("event_roles")
    .select("event_id")
    .eq("user_id", user.id);
  const otherIds = (roles ?? []).map((r) => r.event_id).filter(Boolean);
  const { data: otherEvents } = otherIds.length
    ? await supabase.from("events").select("id, title, slug, starts_at, created_at").in("id", otherIds)
    : { data: [] };
  const events = [...(myEvents ?? []), ...(otherEvents ?? [])].filter(
    (e, i, a) => a.findIndex((x) => x.id === e.id) === i
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-[var(--foreground)]">
            Slot Time
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">Participant view</Link>
            <span className="text-sm text-[var(--muted)]">Admin</span>
            <AdminSignOut />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-6">Your events</h1>
        <AdminEventList events={events ?? []} />
      </main>
    </div>
  );
}
