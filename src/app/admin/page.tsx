import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminEventList } from "./admin-event-list";
import { AdminSignOut } from "./admin-sign-out";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
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
