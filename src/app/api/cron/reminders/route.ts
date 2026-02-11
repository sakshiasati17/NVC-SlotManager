import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { format } from "date-fns";
import { reminder } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";

const CRON_SECRET = process.env.CRON_SECRET;

/** Time windows: send reminder when slot start falls inside the window (cron runs every 5–15 min) */
const REMINDER_WINDOWS = [
  { type: "24h" as const, minMinutes: 23 * 60 + 50, maxMinutes: 24 * 60 + 10, whenLabel: "1 day before" },
  { type: "30m" as const, minMinutes: 25, maxMinutes: 35, whenLabel: "30 minutes before" },
  { type: "15m" as const, minMinutes: 10, maxMinutes: 20, whenLabel: "15 minutes before" },
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (CRON_SECRET && searchParams.get("secret") !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const now = new Date();
  let totalSent = 0;

  for (const { type, minMinutes, maxMinutes, whenLabel } of REMINDER_WINDOWS) {
    const from = new Date(now.getTime() + minMinutes * 60 * 1000);
    const to = new Date(now.getTime() + maxMinutes * 60 * 1000);

    const { data: slots } = await supabase
      .from("slots")
      .select("id, event_id, starts_at, ends_at")
      .gte("starts_at", from.toISOString())
      .lte("starts_at", to.toISOString());

    if (!slots?.length) continue;

    const slotIds = slots.map((s) => s.id);
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, slot_id, event_id, participant_email, participant_name")
      .in("slot_id", slotIds)
      .eq("status", "confirmed");

    if (!bookings?.length) continue;

    const { data: alreadySent } = await supabase
      .from("reminder_sent")
      .select("booking_id")
      .in("booking_id", bookings.map((b) => b.id))
      .eq("reminder_type", type);

    const sentBookingIds = new Set((alreadySent ?? []).map((r) => r.booking_id));
    const toSend = bookings.filter((b) => !sentBookingIds.has(b.id));
    if (!toSend.length) continue;

    const eventsById = new Map<string | null, { title: string; slug: string }>();
    const eventIds = [...new Set(toSend.map((b) => b.event_id))];
    const { data: events } = await supabase.from("events").select("id, title, slug").in("id", eventIds);
    (events ?? []).forEach((e) => eventsById.set(e.id, e));
    const slotsById = new Map(slots.map((s) => [s.id, s]));
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    for (const b of toSend) {
      const ev = eventsById.get(b.event_id) ?? null;
      const slot = slotsById.get(b.slot_id);
      if (!ev || !slot) continue;
      const eventUrl = `${baseUrl}/e/${ev.slug}`;
      const { subject, html } = reminder({
        participantName: b.participant_name ?? undefined,
        eventTitle: ev.title ?? "Event",
        slotStart: format(new Date(slot.starts_at), "EEE, MMM d 'at' h:mm a"),
        slotEnd: format(new Date(slot.ends_at), "h:mm a"),
        eventUrl,
        whenLabel,
      });
      const result = await sendEmail(b.participant_email, subject, html);
      if (result.ok) {
        await supabase.from("reminder_sent").insert({ booking_id: b.id, reminder_type: type });
        totalSent++;
      }
    }
  }

  return NextResponse.json({ sent: totalSent });
}
