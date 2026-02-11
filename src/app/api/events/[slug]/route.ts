import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const { data: slots, error: slotsError } = await supabase
    .from("slots")
    .select("*")
    .eq("event_id", event.id)
    .order("starts_at", { ascending: true });

  if (slotsError) return NextResponse.json({ error: slotsError.message }, { status: 500 });

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

  return NextResponse.json({ ...event, slots: slotsWithBooking });
}
