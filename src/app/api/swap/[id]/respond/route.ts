import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const respondSchema = z.object({ accept: z.boolean() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { accept } = respondSchema.parse(body);

  const { data: swap, error: swapErr } = await supabase
    .from("swap_requests")
    .select("id, event_id, target_booking_id, status")
    .eq("id", id)
    .single();

  if (swapErr || !swap || swap.status !== "pending") {
    return NextResponse.json({ error: "Swap request not found or already handled" }, { status: 404 });
  }

  const { data: targetBooking } = await supabase.from("bookings").select("auth_user_id").eq("id", swap.target_booking_id).single();
  if (!targetBooking || targetBooking.auth_user_id !== user.id) {
    return NextResponse.json({ error: "Only the person in the target slot can respond" }, { status: 403 });
  }

  if (accept) {
    const { data: rpcResult, error: rpcErr } = await supabase.rpc("accept_swap", {
      swap_request_id: id,
      accepting_user_id: user.id,
    });
    if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 });
    const result = rpcResult as { ok?: boolean; error?: string };
    if (!result?.ok) return NextResponse.json({ error: result.error ?? "Swap failed" }, { status: 400 });
  } else {
    const { error: updateErr } = await supabase
      .from("swap_requests")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", id);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, accepted: accept });
}
