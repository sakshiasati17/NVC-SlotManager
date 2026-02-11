import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { EventSchedule } from "./event-schedule";

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  if (eventError || !event) notFound();

  const { data: slots } = await supabase
    .from("slots")
    .select("*")
    .eq("event_id", event.id)
    .order("starts_at");

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, team:teams(*)")
    .eq("event_id", event.id)
    .eq("status", "confirmed");

  const { data: waitlistCounts } = await supabase
    .from("waitlist")
    .select("slot_id")
    .eq("event_id", event.id);

  const bookingBySlot = new Map((bookings ?? []).map((b) => [b.slot_id, b]));
  const waitlistBySlot = new Map<string, number>();
  for (const w of waitlistCounts ?? []) {
    waitlistBySlot.set(w.slot_id, (waitlistBySlot.get(w.slot_id) ?? 0) + 1);
  }

  const slotsWithBooking = (slots ?? []).map((slot) => ({
    ...slot,
    booking: bookingBySlot.get(slot.id) ?? null,
    waitlist_count: waitlistBySlot.get(slot.id) ?? 0,
  }));

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{event.title}</h1>
          {event.description && (
            <p className="mt-1 text-[var(--muted)]">{event.description}</p>
          )}
          <p className="mt-2 text-sm text-[var(--muted)]">
            {event.starts_at && format(new Date(event.starts_at), "EEEE, MMM d, yyyy")}
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <EventSchedule
          event={{ ...event, slots: slotsWithBooking }}
        />
      </main>
    </div>
  );
}
