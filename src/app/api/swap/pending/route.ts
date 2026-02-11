import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("event_id");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: swaps } = await supabase
    .from("swap_requests")
    .select("id, event_id, requester_booking_id, target_booking_id, created_at")
    .eq("status", "pending");

  if (!swaps?.length) return NextResponse.json([]);
  let filtered = swaps;
  if (eventId) filtered = swaps.filter((s) => s.event_id === eventId);
  const targetIds = [...new Set(filtered.map((s) => s.target_booking_id))];
  const { data: targets } = await supabase.from("bookings").select("id, auth_user_id").in("id", targetIds);
  const myTargetIds = new Set((targets ?? []).filter((b) => b.auth_user_id === user.id).map((b) => b.id));
  const forMe = filtered.filter((s) => myTargetIds.has(s.target_booking_id));
  if (!forMe.length) return NextResponse.json([]);

  const eventIds = [...new Set(forMe.map((s) => s.event_id))];
  const { data: events } = await supabase.from("events").select("id, title, slug").in("id", eventIds);
  const eventById = new Map((events ?? []).map((e) => [e.id, e]));

  const allBookingIds = [...new Set(forMe.flatMap((s) => [s.requester_booking_id, s.target_booking_id]))];
  const { data: allBookings } = await supabase.from("bookings").select("id, participant_name, participant_email, slot_id").in("id", allBookingIds);
  const bookingById = new Map((allBookings ?? []).map((b) => [b.id, b]));
  const slotIds = [...new Set((allBookings ?? []).map((b) => b.slot_id))];
  const { data: slotRows } = await supabase.from("slots").select("id, starts_at, ends_at").in("id", slotIds);
  const slotsById = new Map((slotRows ?? []).map((s) => [s.id, s]));

  const formatSlot = (slot: { starts_at: string; ends_at: string } | undefined) =>
    slot ? `${new Date(slot.starts_at).toLocaleString()} – ${new Date(slot.ends_at).toLocaleTimeString()}` : "";

  const result = forMe.map((s) => {
    const ev = eventById.get(s.event_id);
    const req = bookingById.get(s.requester_booking_id);
    const tgt = bookingById.get(s.target_booking_id);
    const reqSlot = req ? slotsById.get(req.slot_id) : undefined;
    const tgtSlot = tgt ? slotsById.get(tgt.slot_id) : undefined;
    return {
      id: s.id,
      event_id: s.event_id,
      event_title: ev?.title ?? "Event",
      event_slug: ev?.slug ?? "",
      created_at: s.created_at,
      requester_name: req?.participant_name || req?.participant_email || "Someone",
      requester_email: req?.participant_email,
      requester_slot: formatSlot(reqSlot),
      your_slot: formatSlot(tgtSlot),
    };
  });

  return NextResponse.json(result);
}
