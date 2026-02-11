import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { format } from "date-fns";
import { swapRequest } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";

const requestSchema = z.object({
  event_id: z.string().uuid(),
  requester_booking_id: z.string().uuid(),
  target_booking_id: z.string().uuid(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(parsed.error.flatten(), { status: 400 });

  const { event_id, requester_booking_id, target_booking_id } = parsed.data;
  if (requester_booking_id === target_booking_id) return NextResponse.json({ error: "Same booking" }, { status: 400 });

  const { data: requester } = await supabase.from("bookings").select("id, auth_user_id").eq("id", requester_booking_id).eq("event_id", event_id).eq("status", "confirmed").single();
  const { data: target } = await supabase.from("bookings").select("id, auth_user_id").eq("id", target_booking_id).eq("event_id", event_id).eq("status", "confirmed").single();

  if (!requester || requester.auth_user_id !== user.id) return NextResponse.json({ error: "Not your booking" }, { status: 403 });
  if (!target) return NextResponse.json({ error: "Target slot booking not found" }, { status: 404 });

  const { data: existing } = await supabase.from("swap_requests").select("id").eq("requester_booking_id", requester_booking_id).eq("target_booking_id", target_booking_id).eq("status", "pending").maybeSingle();
  if (existing) return NextResponse.json({ error: "Swap already requested" }, { status: 409 });

  const { data: swap, error } = await supabase.from("swap_requests").insert({
    event_id,
    requester_booking_id,
    target_booking_id,
    status: "pending",
  }).select("*").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: event } = await supabase.from("events").select("title, slug").eq("id", event_id).single();
  const { data: reqBooking } = await supabase.from("bookings").select("participant_name, participant_email, slot_id").eq("id", requester_booking_id).single();
  const { data: tgtBooking } = await supabase.from("bookings").select("participant_name, participant_email, slot_id").eq("id", target_booking_id).single();
  const { data: reqSlot } = reqBooking ? await supabase.from("slots").select("starts_at, ends_at").eq("id", reqBooking.slot_id).single() : { data: null };
  const { data: tgtSlot } = tgtBooking ? await supabase.from("slots").select("starts_at, ends_at").eq("id", tgtBooking.slot_id).single() : { data: null };

  if (event && tgtBooking?.participant_email && reqBooking && reqSlot && tgtSlot) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const eventUrl = `${baseUrl}/e/${event.slug}`;
    const requesterName = reqBooking.participant_name?.trim() || reqBooking.participant_email || "Someone";
    const targetName = tgtBooking.participant_name?.trim() || tgtBooking.participant_email || "there";
    const requesterSlotStr = `${format(new Date(reqSlot.starts_at), "EEE, MMM d 'at' h:mm a")} – ${format(new Date(reqSlot.ends_at), "h:mm a")}`;
    const targetSlotStr = `${format(new Date(tgtSlot.starts_at), "EEE, MMM d 'at' h:mm a")} – ${format(new Date(tgtSlot.ends_at), "h:mm a")}`;
    const { subject, html } = swapRequest({
      targetName,
      requesterName,
      requesterSlot: requesterSlotStr,
      targetSlot: targetSlotStr,
      eventTitle: event.title ?? "Event",
      eventUrl,
    });
    await sendEmail(tgtBooking.participant_email, subject, html);
  }

  return NextResponse.json(swap);
}
