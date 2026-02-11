import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { format } from "date-fns";
import { signupConfirmation, waitlistJoined } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";

const signupSchema = z.object({
  slot_id: z.string().uuid(),
  event_id: z.string().uuid(),
  participant_email: z.string().email(),
  participant_name: z.string().optional(),
  participant_phone: z.string().optional(),
  team_id: z.string().uuid().optional(),
  team_name: z.string().min(1).optional(),
  join_waitlist: z.boolean().optional(),
});

// Transaction-safe: one booking per slot (UNIQUE on slot_id). If slot taken, insert fails.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = await req.json();
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(parsed.error.flatten(), { status: 400 });

  const { slot_id, event_id, participant_email, participant_name, participant_phone, team_name, join_waitlist } = parsed.data;
  let { team_id } = parsed.data;
  if (team_name?.trim() && !team_id) {
    const { data: existingTeam } = await supabase.from("teams").select("id").eq("event_id", event_id).eq("name", team_name.trim()).maybeSingle();
    if (existingTeam) team_id = existingTeam.id;
    else {
      const { data: newTeam, error: teamErr } = await supabase.from("teams").insert({ event_id, name: team_name.trim() }).select("id").single();
      if (!teamErr && newTeam) team_id = newTeam.id;
    }
  }

  if (!user) {
    return NextResponse.json({ error: "Sign in to sign up or join the waitlist." }, { status: 401 });
  }

  const { data: slot } = await supabase.from("slots").select("id, capacity").eq("id", slot_id).eq("event_id", event_id).single();
  if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

  const { data: existing } = await supabase.from("bookings").select("id").eq("slot_id", slot_id).eq("status", "confirmed").maybeSingle();

  if (existing) {
    if (join_waitlist) {
      const { data: maxPos } = await supabase.from("waitlist").select("position").eq("slot_id", slot_id).order("position", { ascending: false }).limit(1).maybeSingle();
      const position = (maxPos?.position ?? 0) + 1;
      const { data: wl, error: wlError } = await supabase.from("waitlist").insert({
        slot_id,
        event_id,
        participant_email,
        participant_name: participant_name ?? null,
        participant_phone: participant_phone ?? null,
        auth_user_id: user?.id ?? null,
        team_id: team_id ?? null,
        position,
      }).select("id").single();
      if (wlError) return NextResponse.json({ error: wlError.message }, { status: 500 });
      const { data: eventRow } = await supabase.from("events").select("title, slug").eq("id", event_id).single();
      const { data: slotRow } = await supabase.from("slots").select("starts_at, ends_at").eq("id", slot_id).single();
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const eventUrl = `${baseUrl}/e/${eventRow?.slug ?? ""}`;
      const { subject, html } = waitlistJoined({
        participantName: participant_name ?? undefined,
        eventTitle: eventRow?.title ?? "Event",
        slotStart: slotRow ? format(new Date(slotRow.starts_at), "EEE, MMM d 'at' h:mm a") : "",
        slotEnd: slotRow ? format(new Date(slotRow.ends_at), "h:mm a") : "",
        eventUrl,
      });
      await sendEmail(participant_email, subject, html);
      return NextResponse.json({ waitlist: true, id: wl.id });
    }
    return NextResponse.json({ error: "Slot is already taken" }, { status: 409 });
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      slot_id,
      event_id,
      participant_email,
      participant_name: participant_name ?? null,
      participant_phone: participant_phone ?? null,
      auth_user_id: user?.id ?? null,
      team_id: team_id ?? null,
      status: "confirmed",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Slot was just taken. Please pick another." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: event } = await supabase.from("events").select("title, slug, notify_email").eq("id", event_id).single();
  const { data: slotRow } = await supabase.from("slots").select("starts_at, ends_at").eq("id", slot_id).single();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const eventUrl = `${baseUrl}/e/${event?.slug ?? ""}`;
  const { subject, html } = signupConfirmation({
    participantName: participant_name ?? undefined,
    eventTitle: event?.title ?? "Event",
    slotStart: slotRow ? format(new Date(slotRow.starts_at), "EEE, MMM d 'at' h:mm a") : "",
    slotEnd: slotRow ? format(new Date(slotRow.ends_at), "h:mm a") : "",
    eventUrl,
  });
  await sendEmail(participant_email, subject, html);

  return NextResponse.json(booking);
}
