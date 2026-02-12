import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { format } from "date-fns";
import { signupConfirmation } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";

/** GET: validate token and return verification info for the confirm page. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  await params;
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: raw, error: rpcError } = await supabase.rpc("get_signup_verification", { tok: token });

  if (rpcError || raw == null) {
    return NextResponse.json({ valid: false, error: "Link expired or invalid." }, { status: 400 });
  }

  return NextResponse.json({
    valid: true,
    event_id: raw.event_id,
    slot_id: raw.slot_id,
    participant_email: raw.participant_email,
    participant_name: raw.participant_name,
  });
}

/** POST: complete signup (create booking from verification), send confirmation email. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();
  const token = typeof body?.token === "string" ? body.token : null;

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: verification } = await supabase.rpc("get_signup_verification", { tok: token });
  if (!verification) {
    return NextResponse.json({ error: "Link expired or invalid." }, { status: 400 });
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, title, slug")
    .eq("id", verification.event_id)
    .single();
  const { data: slot } = await supabase
    .from("slots")
    .select("id, starts_at, ends_at")
    .eq("id", verification.slot_id)
    .single();

  const { data: result, error: completeError } = await supabase.rpc("complete_signup_verification", { tok: token });

  if (completeError || !result?.ok) {
    return NextResponse.json(
      { error: result?.error ?? "Could not complete signup." },
      { status: 400 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const eventUrl = `${baseUrl}/e/${event?.slug ?? slug}`;
  const slotStart = slot ? format(new Date(slot.starts_at), "EEE, MMM d 'at' h:mm a") : "";
  const slotEnd = slot ? format(new Date(slot.ends_at), "h:mm a") : "";
  const { subject, html } = signupConfirmation({
    participantName: verification.participant_name ?? undefined,
    eventTitle: event?.title ?? "Event",
    slotStart,
    slotEnd,
    eventUrl,
  });
  await sendEmail(verification.participant_email, subject, html);

  return NextResponse.json({
    ok: true,
    slug: event?.slug ?? slug,
    message: "You're signed up!",
    booking_id: result.booking_id,
    event_title: event?.title ?? "Event",
    slot_start: slot?.starts_at ?? null,
    slot_end: slot?.ends_at ?? null,
  });
}
