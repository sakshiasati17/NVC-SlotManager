import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EventManage } from "./event-manage";

export default async function AdminEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !event) notFound();

  const { data: role } = await supabase.from("event_roles").select("role").eq("event_id", id).eq("user_id", user.id).maybeSingle();
  const isOwner = event.created_by === user.id;
  const canManage = isOwner || (role && (role.role === "admin" || role.role === "coordinator"));
  if (!canManage) notFound();

  const { data: slots } = await supabase.from("slots").select("id, starts_at, ends_at, label").eq("event_id", id).order("starts_at");

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/admin" className="text-[var(--foreground)] hover:underline">
            ← Admin
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">{event.title}</h1>
        <p className="text-[var(--muted)] mb-6">
          Public link: <a href={`/e/${event.slug}`} className="text-[var(--accent)] underline" target="_blank" rel="noopener noreferrer">/e/{event.slug}</a>
        </p>
        <EventManage event={event} slots={slots ?? []} />
      </main>
    </div>
  );
}
