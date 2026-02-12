import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isAllowedAdmin } from "@/lib/admin-access";

const ANALYTICS_ACTIONS = [
  "booking_confirmed",
  "booking_cancelled",
  "booking_cancelled_by_admin",
  "swap_requested",
  "swap_accepted",
  "swap_declined",
] as const;

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

  const { allowed: isStaffAdmin } = await isAllowedAdmin();
  const { data: role } = await supabase.from("event_roles").select("role").eq("event_id", eventId).eq("user_id", user.id).maybeSingle();
  const isOwner = event.created_by === user.id;
  if (!isStaffAdmin && !isOwner && (!role || (role.role !== "admin" && role.role !== "coordinator"))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { data: rows, error } = await supabase
    .from("audit_log")
    .select("action")
    .eq("event_id", eventId)
    .in("action", [...ANALYTICS_ACTIONS]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const signups = (rows ?? []).filter((r) => r.action === "booking_confirmed").length;
  const cancels =
    (rows ?? []).filter((r) => r.action === "booking_cancelled" || r.action === "booking_cancelled_by_admin").length;
  const swap_requested = (rows ?? []).filter((r) => r.action === "swap_requested").length;
  const swap_accepted = (rows ?? []).filter((r) => r.action === "swap_accepted").length;
  const swap_declined = (rows ?? []).filter((r) => r.action === "swap_declined").length;

  return NextResponse.json({
    signups,
    cancels,
    swap_requested,
    swap_accepted,
    swap_declined,
    cancel_rate: signups > 0 ? Math.round((cancels / signups) * 100) : 0,
    swap_accept_rate:
      swap_accepted + swap_declined > 0
        ? Math.round((swap_accepted / (swap_accepted + swap_declined)) * 100)
        : 0,
  });
}
