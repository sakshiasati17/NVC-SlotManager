import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAllowedAdmin } from "@/lib/admin-access";

const bodySchema = z.object({
  slot_id: z.string().uuid(),
  new_starts_at: z.string().datetime(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json(parsed.error.flatten(), { status: 400 });

  const { slot_id, new_starts_at } = parsed.data;

  const { data: slot, error: slotErr } = await supabase
    .from("slots")
    .select("id, event_id, starts_at, ends_at, label")
    .eq("id", slot_id)
    .single();
  if (slotErr || !slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

  const { allowed: isStaffAdmin } = await isAllowedAdmin();
  const { data: event } = await supabase.from("events").select("created_by").eq("id", slot.event_id).single();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const { data: role } = await supabase.from("event_roles").select("role").eq("event_id", slot.event_id).eq("user_id", user.id).maybeSingle();
  const isOwner = event.created_by === user.id;
  if (!isStaffAdmin && !isOwner && (!role || (role.role !== "admin" && role.role !== "coordinator"))) {
    return NextResponse.json({ error: "Not authorized to manage this event" }, { status: 403 });
  }

  const start = new Date(new_starts_at);
  const durationMs = new Date(slot.ends_at).getTime() - new Date(slot.starts_at).getTime();
  const end = new Date(start.getTime() + durationMs);

  const { data: existing } = await supabase.from("slots").select("sort_order").eq("event_id", slot.event_id).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const sort_order = (existing?.sort_order ?? -1) + 1;

  const { data: newSlot, error: insertErr } = await supabase
    .from("slots")
    .insert({
      event_id: slot.event_id,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      label: slot.label,
      sort_order,
    })
    .select("id")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") return NextResponse.json({ error: "A slot already exists at that start time" }, { status: 409 });
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: newSlot.id });
}
