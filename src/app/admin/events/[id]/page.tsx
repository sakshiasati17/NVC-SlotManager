import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EventManage } from "./event-manage";
import { AdminSignOut } from "../../admin-sign-out";

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
  const { data: bookings } = await supabase
    .from("bookings")
    .select("slot_id, participant_name, participant_email")
    .eq("event_id", id)
    .eq("status", "confirmed");

  const bookingBySlotId = new Map((bookings ?? []).map((b) => [b.slot_id, b]));
  const slotsWithStatus = (slots ?? []).map((s) => ({
    id: s.id,
    starts_at: s.starts_at,
    ends_at: s.ends_at,
    label: s.label,
    status: bookingBySlotId.has(s.id) ? ("taken" as const) : ("available" as const),
    participant_name: bookingBySlotId.get(s.id)?.participant_name ?? null,
    participant_email: bookingBySlotId.get(s.id)?.participant_email ?? null,
  }));

  const totalSlots = slotsWithStatus.length;
  const takenCount = slotsWithStatus.filter((s) => s.status === "taken").length;
  const availableCount = totalSlots - takenCount;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/admin" className="text-[var(--foreground)] hover:underline">
            ← Admin
          </Link>
          <AdminSignOut />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <EventManage
          event={event}
          slots={slotsWithStatus}
          stats={{ total: totalSlots, available: availableCount, taken: takenCount }}
        />
      </main>
    </div>
  );
}
