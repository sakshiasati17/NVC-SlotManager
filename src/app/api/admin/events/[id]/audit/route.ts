import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: event } = await supabase.from("events").select("id, created_by").eq("id", eventId).single();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: role } = await supabase.from("event_roles").select("role").eq("event_id", eventId).eq("user_id", user.id).maybeSingle();
  const isOwner = event.created_by === user.id;
  if (!isOwner && (!role || (role.role !== "admin" && role.role !== "coordinator"))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { data: logs, error } = await supabase
    .from("audit_log")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(logs ?? []);
}
