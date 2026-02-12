import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { format } from "date-fns";
import { isAllowedAdmin } from "@/lib/admin-access";
import { bookingCancelled } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";

const updateSlotSchema = z.object({
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
  label: z.string().max(200).optional().nullable(),
}).refine((d) => d.starts_at !== undefined || d.ends_at !== undefined || d.label !== undefined, { message: "At least one field required" });

async function checkSlotAuth(supabase: Awaited<ReturnType<typeof createClient>>, slotId: string, eventId: string, userId: string) {
  const { data: event } = await supabase.from("events").select("created_by").eq("id", eventId).single();
  if (!event) return { ok: false as const, error: "Event not found" };
  const { data: role } = await supabase.from("event_roles").select("role").eq("event_id", eventId).eq("user_id", userId).maybeSingle();
  const isOwner = event.created_by === userId;
  const isAdmin = role && (role.role === "admin" || role.role === "coordinator");
  if (!isOwner && !isAdmin) return { ok: false as const, error: "Not authorized" };
  return { ok: true as const };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: slotId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: slot, error: slotErr } = await supabase
    .from("slots")
    .select("id, event_id, starts_at, ends_at, label")
    .eq("id", slotId)
    .single();
  if (slotErr || !slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

  const { allowed: isStaffAdmin } = await isAllowedAdmin();
  if (!isStaffAdmin) {
    const auth = await checkSlotAuth(supabase, slotId, slot.event_id, user.id);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSlotSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(parsed.error.flatten(), { status: 400 });

  const starts_at = parsed.data.starts_at !== undefined ? new Date(parsed.data.starts_at) : new Date(slot.starts_at);
  const ends_at = parsed.data.ends_at !== undefined ? new Date(parsed.data.ends_at) : new Date(slot.ends_at);
  if (ends_at <= starts_at) return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });

  const update: { starts_at: string; ends_at: string; label?: string | null } = {
    starts_at: starts_at.toISOString(),
    ends_at: ends_at.toISOString(),
  };
  if (parsed.data.label !== undefined) update.label = (parsed.data.label ?? "").trim() || null;

  const { error: updateErr } = await supabase.from("slots").update(update).eq("id", slotId);
  if (updateErr) {
    if (updateErr.code === "23505") return NextResponse.json({ error: "Another slot already has this start time" }, { status: 409 });
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

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

  const { allowed: isStaffAdmin } = await isAllowedAdmin();
  if (!isStaffAdmin) {
    const auth = await checkSlotAuth(supabase, slotId, slot.event_id, user.id);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const { data: event } = await supabase.from("events").select("title, slug").eq("id", slot.event_id).single();

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
