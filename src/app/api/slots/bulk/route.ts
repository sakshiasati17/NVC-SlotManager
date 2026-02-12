import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { addMinutes, parseISO } from "date-fns";
import { isAllowedAdmin } from "@/lib/admin-access";

const bulkSlotsSchema = z.object({
  event_id: z.string().uuid(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  duration_minutes: z.number().int().min(5).max(480),
  label_template: z.string().optional(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = bulkSlotsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(parsed.error.flatten(), { status: 400 });

  const { event_id, start, end, duration_minutes, label_template } = parsed.data;
  const startDate = parseISO(start);
  const endDate = parseISO(end);

  const { allowed: isStaffAdmin } = await isAllowedAdmin();
  const { data: event } = await supabase.from("events").select("id, created_by").eq("id", event_id).single();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: role } = await supabase.from("event_roles").select("role").eq("event_id", event_id).eq("user_id", user.id).maybeSingle();
  const isOwner = event.created_by === user.id;
  if (!isStaffAdmin && !isOwner && (!role || (role.role !== "admin" && role.role !== "coordinator"))) {
    return NextResponse.json({ error: "Not authorized to manage this event" }, { status: 403 });
  }

  const slots: { event_id: string; starts_at: string; ends_at: string; label: string | null; sort_order: number }[] = [];
  let current = startDate;
  let order = 0;
  while (current < endDate) {
    const slotEnd = addMinutes(current, duration_minutes);
    if (slotEnd > endDate) break;
    const label = label_template ? label_template.replace("{{n}}", String(order + 1)) : null;
    slots.push({
      event_id,
      starts_at: current.toISOString(),
      ends_at: slotEnd.toISOString(),
      label,
      sort_order: order++,
    });
    current = slotEnd;
  }

  if (slots.length === 0) return NextResponse.json({ error: "No slots generated; check start/end/duration" }, { status: 400 });

  const { data: inserted, error } = await supabase.from("slots").insert(slots).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ created: inserted?.length ?? 0, slots: inserted });
}
