import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** GET: return .ics file for this booking (owner only). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, auth_user_id, event_id, participant_email, slot_id")
    .eq("id", id)
    .eq("status", "confirmed")
    .single();

  if (fetchError || !booking)
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.auth_user_id !== user?.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: event } = await supabase
    .from("events")
    .select("title, slug")
    .eq("id", booking.event_id)
    .single();
  const { data: slot } = await supabase
    .from("slots")
    .select("starts_at, ends_at, label")
    .eq("id", booking.slot_id)
    .single();

  if (!event || !slot) return NextResponse.json({ error: "Event or slot not found" }, { status: 404 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const eventUrl = `${baseUrl}/e/${event.slug}`;
  const title = event.title ?? "Slot";
  const desc = `${title}${slot.label ? ` - ${slot.label}` : ""}\n${eventUrl}`;
  const start = new Date(slot.starts_at);
  const end = new Date(slot.ends_at);

  const formatICSDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Slot Time//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:booking-" + id + "@slot-time",
    "DTSTAMP:" + formatICSDate(new Date()),
    "DTSTART:" + formatICSDate(start),
    "DTEND:" + formatICSDate(end),
    "SUMMARY:" + escapeICS(title),
    "DESCRIPTION:" + escapeICS(desc),
    "URL:" + eventUrl,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="slot.ics"',
    },
  });
}

function escapeICS(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
