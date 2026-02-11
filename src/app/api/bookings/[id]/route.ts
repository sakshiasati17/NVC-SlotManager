import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, auth_user_id, event_id")
    .eq("id", id)
    .single();

  if (fetchError || !booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.auth_user_id !== user?.id) {
    const { data: role } = await supabase.from("event_roles").select("role").eq("event_id", booking.event_id).eq("user_id", user?.id).maybeSingle();
    if (!role || (role.role !== "admin" && role.role !== "coordinator")) {
      return NextResponse.json({ error: "You can only cancel your own booking" }, { status: 403 });
    }
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await supabase.from("audit_log").insert({
    event_id: booking.event_id,
    actor_id: user?.id ?? null,
    action: "booking_cancelled",
    resource_type: "booking",
    resource_id: id,
    details: {},
  });

  return NextResponse.json({ ok: true });
}
