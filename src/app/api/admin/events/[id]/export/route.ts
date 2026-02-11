import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { format } from "date-fns";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: event } = await supabase.from("events").select("id, title, created_by").eq("id", eventId).single();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: role } = await supabase.from("event_roles").select("role").eq("event_id", eventId).eq("user_id", user.id).maybeSingle();
  const isOwner = event.created_by === user.id;
  if (!isOwner && (!role || (role.role !== "admin" && role.role !== "coordinator"))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { data: slots } = await supabase.from("slots").select("id, starts_at, ends_at, label").eq("event_id", eventId).order("starts_at");
  const { data: bookings } = await supabase.from("bookings").select("slot_id, participant_name, participant_email, participant_phone, status, created_at").eq("event_id", eventId).eq("status", "confirmed");

  const bookingBySlot = new Map((bookings ?? []).map((b) => [b.slot_id, b]));

  const headers = ["Slot Start", "Slot End", "Label", "Participant Name", "Email", "Phone", "Signed Up At"];
  const rows = (slots ?? []).map((s) => {
    const b = bookingBySlot.get(s.id);
    return [
      format(new Date(s.starts_at), "yyyy-MM-dd HH:mm"),
      format(new Date(s.ends_at), "yyyy-MM-dd HH:mm"),
      s.label ?? "",
      b?.participant_name ?? "",
      b?.participant_email ?? "",
      b?.participant_phone ?? "",
      b?.created_at ? format(new Date(b.created_at), "yyyy-MM-dd HH:mm") : "",
    ];
  });

  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");

  await supabase.from("audit_log").insert({
    event_id: eventId,
    actor_id: user.id,
    action: "export_csv",
    resource_type: "event",
    resource_id: eventId,
    details: { row_count: rows.length },
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.title.replace(/[^a-z0-9]/gi, "_")}_signups.csv"`,
    },
  });
}
