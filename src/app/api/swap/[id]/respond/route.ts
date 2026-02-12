import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { format } from "date-fns";
import { swapAccepted, swapDeclined } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";

const respondSchema = z.object({ accept: z.boolean() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { accept } = respondSchema.parse(body);

  const { data: swap, error: swapErr } = await supabase
    .from("swap_requests")
    .select("id, event_id, requester_booking_id, target_booking_id, status")
    .eq("id", id)
    .single();

  if (swapErr || !swap || swap.status !== "pending") {
    return NextResponse.json({ error: "Swap request not found or already handled" }, { status: 404 });
  }

  const { data: targetBooking } = await supabase.from("bookings").select("auth_user_id").eq("id", swap.target_booking_id).single();
  if (!targetBooking || targetBooking.auth_user_id !== user.id) {
    return NextResponse.json({ error: "Only the person in the target slot can respond" }, { status: 403 });
  }

  const { data: requesterBooking } = await supabase.from("bookings").select("auth_user_id, participant_email, participant_name, slot_id").eq("id", swap.requester_booking_id).single();
  const { data: targetBookingFull } = await supabase.from("bookings").select("participant_email, participant_name, slot_id").eq("id", swap.target_booking_id).single();
  const { data: event } = await supabase.from("events").select("title, slug").eq("id", swap.event_id).single();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const eventUrl = event?.slug ? `${baseUrl}/e/${event.slug}` : baseUrl;
  const eventTitle = event?.title ?? "Event";

  if (accept) {
    const { data: rpcResult, error: rpcErr } = await supabase.rpc("accept_swap", {
      swap_request_id: id,
      accepting_user_id: user.id,
    });
    if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 });
    const result = rpcResult as { ok?: boolean; error?: string };
    if (!result?.ok) return NextResponse.json({ error: result.error ?? "Swap failed" }, { status: 400 });

    await supabase.from("audit_log").insert({
      event_id: swap.event_id,
      actor_id: user.id,
      action: "swap_accepted",
      resource_type: "swap_request",
      resource_id: id,
    });

    const requesterId = requesterBooking?.auth_user_id;
    const targetId = targetBooking.auth_user_id;
    const { data: newBookings } = requesterId && targetId
      ? await supabase.from("bookings").select("id, auth_user_id, slot_id").eq("event_id", swap.event_id).eq("status", "confirmed").in("auth_user_id", [requesterId, targetId])
      : { data: [] };
    const slotIds = [...new Set((newBookings ?? []).map((b) => b.slot_id))];
    const { data: slotsData } = slotIds.length
      ? await supabase.from("slots").select("id, starts_at, ends_at").in("id", slotIds)
      : { data: [] };
    const slotsById = new Map((slotsData ?? []).map((s) => [s.id, s]));
    const requesterNewBooking = newBookings?.find((b) => b.auth_user_id === requesterId);
    const targetNewBooking = newBookings?.find((b) => b.auth_user_id === targetId);
    let requesterSlot = requesterNewBooking ? slotsById.get(requesterNewBooking.slot_id) : null;
    const targetSlot = targetNewBooking ? slotsById.get(targetNewBooking.slot_id) : null;
    if (!requesterSlot && targetBookingFull?.slot_id) {
      const { data: fallback } = await supabase.from("slots").select("id, starts_at, ends_at").eq("id", targetBookingFull.slot_id).single();
      if (fallback) requesterSlot = fallback;
    }

    const requesterEmail = requesterBooking?.participant_email?.trim() || null;
    if (requesterEmail && requesterSlot) {
      const { subject, html } = swapAccepted({
        participantName: requesterBooking?.participant_name ?? undefined,
        eventTitle,
        newSlotStart: format(new Date(requesterSlot.starts_at), "EEE, MMM d 'at' h:mm a"),
        newSlotEnd: format(new Date(requesterSlot.ends_at), "h:mm a"),
        eventUrl,
      });
      await sendEmail(requesterEmail, subject, html);
    }
    if (targetBookingFull?.participant_email && targetSlot) {
      const { subject, html } = swapAccepted({
        participantName: targetBookingFull.participant_name ?? undefined,
        eventTitle,
        newSlotStart: format(new Date(targetSlot.starts_at), "EEE, MMM d 'at' h:mm a"),
        newSlotEnd: format(new Date(targetSlot.ends_at), "h:mm a"),
        eventUrl,
      });
      await sendEmail(targetBookingFull.participant_email, subject, html);
    }
  } else {
    const { error: updateErr } = await supabase
      .from("swap_requests")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", id);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    await supabase.from("audit_log").insert({
      event_id: swap.event_id,
      actor_id: user.id,
      action: "swap_declined",
      resource_type: "swap_request",
      resource_id: id,
    });

    const requesterEmail = requesterBooking?.participant_email?.trim() || null;
    if (requesterEmail && requesterBooking) {
      const { data: reqSlot } = await supabase.from("slots").select("starts_at, ends_at").eq("id", requesterBooking.slot_id).single();
      const yourSlot = reqSlot ? `${format(new Date(reqSlot.starts_at), "EEE, MMM d 'at' h:mm a")} – ${format(new Date(reqSlot.ends_at), "h:mm a")}` : "";
      const { subject, html } = swapDeclined({
        participantName: requesterBooking.participant_name ?? undefined,
        eventTitle,
        yourSlot,
        eventUrl,
      });
      await sendEmail(requesterEmail, subject, html);
    }
  }

  return NextResponse.json({ ok: true, accepted: accept });
}
