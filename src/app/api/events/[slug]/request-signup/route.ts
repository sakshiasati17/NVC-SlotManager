import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { format } from "date-fns";
import { confirmSignupEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { randomUUID } from "crypto";

const schema = z.object({
  slot_id: z.string().uuid(),
  participant_email: z.string().email(),
  participant_name: z.string().optional(),
  participant_phone: z.string().optional(),
  team_name: z.string().min(1).optional(),
  remind_1_day: z.boolean().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to sign up." }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const { slot_id, participant_email, participant_name, participant_phone, team_name, remind_1_day } = parsed.data;

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, slug")
    .eq("slug", slug)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const { data: slot, error: slotError } = await supabase
    .from("slots")
    .select("id, starts_at, ends_at")
    .eq("id", slot_id)
    .eq("event_id", event.id)
    .single();

  if (slotError || !slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("bookings")
    .select("id")
    .eq("slot_id", slot_id)
    .eq("status", "confirmed")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Slot is already taken" }, { status: 409 });
  }

  let team_id: string | null = null;
  if (team_name?.trim()) {
    const { data: existingTeam } = await supabase
      .from("teams")
      .select("id")
      .eq("event_id", event.id)
      .eq("name", team_name.trim())
      .maybeSingle();
    if (existingTeam) {
      team_id = existingTeam.id;
    } else {
      const { data: newTeam, error: teamErr } = await supabase
        .from("teams")
        .insert({ event_id: event.id, name: team_name.trim() })
        .select("id")
        .single();
      if (!teamErr && newTeam) team_id = newTeam.id;
    }
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  const { error: insertError } = await supabase.from("signup_verifications").insert({
    event_id: event.id,
    slot_id,
    auth_user_id: user.id,
    participant_email,
    participant_name: participant_name ?? null,
    participant_phone: participant_phone ?? null,
    team_id,
    team_name: team_name?.trim() || null,
    token,
    expires_at: expiresAt.toISOString(),
    remind_1_day: remind_1_day !== false,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const confirmUrl = `${baseUrl}/e/${event.slug}/confirm-signup?token=${token}`;

  const slotStart = format(new Date(slot.starts_at), "EEE, MMM d 'at' h:mm a");
  const slotEnd = format(new Date(slot.ends_at), "h:mm a");
  const { subject, html } = confirmSignupEmail({
    eventTitle: event.title,
    slotStart,
    slotEnd,
    confirmUrl,
  });
  await sendEmail(participant_email, subject, html);

  return NextResponse.json({
    ok: true,
    message: "Check your email — click the link we sent to confirm your signup.",
  });
}
