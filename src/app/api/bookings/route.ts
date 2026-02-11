import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const signupSchema = z.object({
  slot_id: z.string().uuid(),
  event_id: z.string().uuid(),
  participant_email: z.string().email(),
  participant_name: z.string().optional(),
  participant_phone: z.string().optional(),
  team_id: z.string().uuid().optional(),
  join_waitlist: z.boolean().optional(),
});

// Transaction-safe: one booking per slot (UNIQUE on slot_id). If slot taken, insert fails.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = await req.json();
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(parsed.error.flatten(), { status: 400 });

  const { slot_id, event_id, participant_email, participant_name, participant_phone, team_id, join_waitlist } = parsed.data;

  const { data: slot } = await supabase.from("slots").select("id, capacity").eq("id", slot_id).eq("event_id", event_id).single();
  if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

  const { data: existing } = await supabase.from("bookings").select("id").eq("slot_id", slot_id).eq("status", "confirmed").maybeSingle();

  if (existing) {
    if (join_waitlist) {
      const { data: maxPos } = await supabase.from("waitlist").select("position").eq("slot_id", slot_id).order("position", { ascending: false }).limit(1).maybeSingle();
      const position = (maxPos?.position ?? 0) + 1;
      const { data: wl, error: wlError } = await supabase.from("waitlist").insert({
        slot_id,
        event_id,
        participant_email,
        participant_name: participant_name ?? null,
        participant_phone: participant_phone ?? null,
        auth_user_id: user?.id ?? null,
        team_id: team_id ?? null,
        position,
      }).select("id").single();
      if (wlError) return NextResponse.json({ error: wlError.message }, { status: 500 });
      return NextResponse.json({ waitlist: true, id: wl.id });
    }
    return NextResponse.json({ error: "Slot is already taken" }, { status: 409 });
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      slot_id,
      event_id,
      participant_email,
      participant_name: participant_name ?? null,
      participant_phone: participant_phone ?? null,
      auth_user_id: user?.id ?? null,
      team_id: team_id ?? null,
      status: "confirmed",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Slot was just taken. Please pick another." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(booking);
}
