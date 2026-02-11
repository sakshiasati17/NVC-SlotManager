import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { format } from "date-fns";
import { bookingCancelled } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: slotId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: slot, error: slotErr } = await supabase
    .from("slots")
    .select("id, event_id, starts_at, ends_at")
    .eq("id", slotId)
    .single();

  if (slotErr || !slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

  const { data: event } = await supabase.from("events").select("created_by, title, slug").eq("id", slot.event_id).single();
  const { data: role } = await supabase.from("event_roles").select("role").eq("event_id", slot.event_id).eq("user_id", user.id).maybeSingle();
  const isOwner = event?.created_by === user.id;
  const isAdmin = role && (role.role === "admin" || role.role === "coordinator");
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Not authorized to manage this event" }, { status: 403 });

  const { data: booking } = await supabase.from("bookings").select("id, participant_email, participant_name").eq("slot_id", slotId).eq("status", "confirmed").maybeSingle();
  if (booking) {
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
    await supabase.from("audit_log").insert({
      event_id: slot.event_id,
      actor_id: user.id,
      action: "booking_cancelled_by_admin",
      resource_type: "booking",
      resource_id: booking.id,
      details: { slot_id: slotId },
    });

    if (booking.participant_email && event?.slug) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const eventUrl = `${baseUrl}/e/${event.slug}`;
      const { subject, html } = bookingCancelled({
        participantName: booking.participant_name ?? undefined,
        eventTitle: event.title ?? "Event",
        slotStart: format(new Date(slot.starts_at), "EEE, MMM d 'at' h:mm a"),
        slotEnd: format(new Date(slot.ends_at), "h:mm a"),
        eventUrl,
        reason: "slot_removed",
      });
      await sendEmail(booking.participant_email, subject, html);
    }
  }

  const { error: deleteErr } = await supabase.from("slots").delete().eq("id", slotId);
  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });

  await supabase.from("audit_log").insert({
    event_id: slot.event_id,
    actor_id: user.id,
    action: "slot_deleted",
    resource_type: "slot",
    resource_id: slotId,
    details: {},
  });

  return NextResponse.json({ ok: true });
}
