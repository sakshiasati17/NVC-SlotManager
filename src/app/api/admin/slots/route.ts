import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAllowedAdmin } from "@/lib/admin-access";

const createSlotSchema = z.object({
  event_id: z.string().uuid(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  label: z.string().max(200).optional().nullable(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSlotSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(parsed.error.flatten(), { status: 400 });

  const { event_id, starts_at, ends_at, label } = parsed.data;
  const starts = new Date(starts_at);
  const ends = new Date(ends_at);
  if (ends <= starts) return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });

  const { allowed: isStaffAdmin } = await isAllowedAdmin();
  const { data: event } = await supabase.from("events").select("id, created_by").eq("id", event_id).single();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: role } = await supabase.from("event_roles").select("role").eq("event_id", event_id).eq("user_id", user.id).maybeSingle();
  const isOwner = event.created_by === user.id;
  if (!isStaffAdmin && !isOwner && (!role || (role.role !== "admin" && role.role !== "coordinator"))) {
    return NextResponse.json({ error: "Not authorized to manage this event" }, { status: 403 });
  }

  const { data: existing } = await supabase.from("slots").select("sort_order").eq("event_id", event_id).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const sort_order = (existing?.sort_order ?? -1) + 1;

  const { data: slot, error } = await supabase
    .from("slots")
    .insert({ event_id, starts_at: starts.toISOString(), ends_at: ends.toISOString(), label: label?.trim() || null, sort_order })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: slot.id });
}
