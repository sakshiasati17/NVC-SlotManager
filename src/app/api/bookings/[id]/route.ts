import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { format } from "date-fns";
import { bookingCancelled, waitlistPromoted, participantCancelledNotifyOrganizer } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, auth_user_id, event_id, participant_email, participant_name, slot_id")
    .eq("id", id)
    .single();

  if (fetchError || !booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.auth_user_id !== user?.id) {
    const { data: role } = await supabase.from("event_roles").select("role").eq("event_id", booking.event_id).eq("user_id", user?.id).maybeSingle();
    if (!role || (role.role !== "admin" && role.role !== "coordinator")) {
      return NextResponse.json({ error: "You can only cancel your own booking" }, { status: 403 });
    }
  }

  const isSelfCancel = booking.auth_user_id === user?.id;
  const { data: event } = await supabase.from("events").select("title, slug, notify_email").eq("id", booking.event_id).single();
  const { data: slot } = await supabase.from("slots").select("starts_at, ends_at").eq("id", booking.slot_id).single();

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await supabase.from("audit_log").insert({
    event_id: booking.event_id,
    actor_id: user?.id ?? null,
    action: "booking_cancelled",
    resource_type: "booking",
    resource_id: id,
    details: {},
  });

  if (booking.participant_email && event?.slug && slot) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const eventUrl = `${baseUrl}/e/${event.slug}`;
    const { subject, html } = bookingCancelled({
      participantName: booking.participant_name ?? undefined,
      eventTitle: event.title ?? "Event",
      slotStart: format(new Date(slot.starts_at), "EEE, MMM d 'at' h:mm a"),
      slotEnd: format(new Date(slot.ends_at), "h:mm a"),
      eventUrl,
      reason: isSelfCancel ? "cancelled_by_you" : "removed_by_organizer",
    });
    await sendEmail(booking.participant_email, subject, html);
  }

  if (isSelfCancel && event?.notify_email && slot) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const eventUrl = `${baseUrl}/e/${event.slug}`;
    const { subject, html } = participantCancelledNotifyOrganizer({
      eventTitle: event.title,
      slotStart: format(new Date(slot.starts_at), "EEE, MMM d 'at' h:mm a"),
      slotEnd: format(new Date(slot.ends_at), "h:mm a"),
      participantName: booking.participant_name ?? undefined,
      participantEmail: booking.participant_email,
      eventUrl,
    });
    await sendEmail(event.notify_email, subject, html);
  }

  const { data: firstWaitlist } = await supabase
    .from("waitlist")
    .select("id, participant_email, participant_name, participant_phone, auth_user_id, team_id")
    .eq("slot_id", booking.slot_id)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstWaitlist && slot && event) {
    const { error: insertErr } = await supabase.from("bookings").insert({
      slot_id: booking.slot_id,
      event_id: booking.event_id,
      participant_email: firstWaitlist.participant_email,
      participant_name: firstWaitlist.participant_name,
      participant_phone: firstWaitlist.participant_phone,
      auth_user_id: firstWaitlist.auth_user_id,
      team_id: firstWaitlist.team_id,
      status: "confirmed",
    });
    if (!insertErr) {
      await supabase.from("waitlist").delete().eq("id", firstWaitlist.id);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const eventUrl = `${baseUrl}/e/${event.slug}`;
      const { subject, html } = waitlistPromoted({
        participantName: firstWaitlist.participant_name ?? undefined,
        eventTitle: event.title,
        slotStart: format(new Date(slot.starts_at), "EEE, MMM d 'at' h:mm a"),
        slotEnd: format(new Date(slot.ends_at), "h:mm a"),
        eventUrl,
      });
      await sendEmail(firstWaitlist.participant_email, subject, html);
    }
  }

  return NextResponse.json({ ok: true });
}
