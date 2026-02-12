import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email/send";
import {
  replacePlaceholders,
  customBodyToHtml,
  inviteToBookEmail,
  wrapHtml,
} from "@/lib/email/templates";

const bodySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("all_booked"),
    subject: z.string().min(1).max(200),
    body: z.string().max(10000),
  }),
  z.object({
    type: z.literal("invite_list"),
    emails: z.array(z.string().email()).min(1).max(500),
    customMessage: z.string().max(2000).optional(),
  }),
]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: event } = await supabase
    .from("events")
    .select("id, title, slug, created_by")
    .eq("id", eventId)
    .single();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: role } = await supabase
    .from("event_roles")
    .select("role")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();
  const isOwner = event.created_by === user.id;
  if (!isOwner && (!role || (role.role !== "admin" && role.role !== "coordinator"))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const raw = await req.json();
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const eventUrl = `${baseUrl}/e/${event.slug}`;
  const eventTitle = event.title ?? "Event";

  if (parsed.data.type === "all_booked") {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("participant_email, participant_name")
      .eq("event_id", eventId)
      .eq("status", "confirmed");
    const unique = Array.from(
      new Map((bookings ?? []).map((b) => [b.participant_email.toLowerCase(), b])).values()
    );
    if (unique.length === 0) {
      return NextResponse.json({ error: "No confirmed participants to email" }, { status: 400 });
    }

    let sent = 0;
    let failed = 0;
    for (const b of unique) {
      const subject = replacePlaceholders(parsed.data.subject, {
        event_title: eventTitle,
        event_link: eventUrl,
        participant_name: b.participant_name ?? "",
        participant_email: b.participant_email,
      });
      const bodyHtml = replacePlaceholders(parsed.data.body, {
        event_title: eventTitle,
        event_link: eventUrl,
        participant_name: b.participant_name ?? "",
        participant_email: b.participant_email,
      });
      const html = wrapHtml(customBodyToHtml(bodyHtml));
      const result = await sendEmail(b.participant_email, subject, html);
      if (result.ok) sent++;
      else failed++;
    }

    await supabase.from("audit_log").insert({
      event_id: eventId,
      actor_id: user.id,
      action: "email_all_participants",
      resource_type: "event",
      resource_id: eventId,
      details: { sent, failed, total: unique.length },
    });

    return NextResponse.json({ sent, failed, total: unique.length });
  }

  // invite_list
  const { emails, customMessage } = parsed.data;
  const { subject, html } = inviteToBookEmail({
    eventTitle,
    eventUrl,
    customMessage: customMessage?.trim() || undefined,
  });

  let sent = 0;
  let failed = 0;
  const seen = new Set<string>();
  for (const email of emails) {
    const key = email.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    const result = await sendEmail(email.trim(), subject, html);
    if (result.ok) sent++;
    else failed++;
  }

  await supabase.from("audit_log").insert({
    event_id: eventId,
    actor_id: user.id,
    action: "email_invite_list",
    resource_type: "event",
    resource_id: eventId,
    details: { sent, failed, total: seen.size },
  });

  return NextResponse.json({ sent, failed, total: seen.size });
}
