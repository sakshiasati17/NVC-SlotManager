import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isAllowedAdmin } from "@/lib/admin-access";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: event } = await supabase.from("events").select("id, created_by, title, slug, description, starts_at, ends_at, timezone, show_contact, allow_swap, allow_waitlist, max_signups_per_participant, notify_email").eq("id", id).single();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { allowed: isStaffAdmin } = await isAllowedAdmin();
  const { data: role } = await supabase.from("event_roles").select("role").eq("event_id", id).eq("user_id", user.id).maybeSingle();
  const canManage = isStaffAdmin || event.created_by === user.id || (role && (role.role === "admin" || role.role === "coordinator"));
  if (!canManage) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const baseSlug = event.slug.replace(/-copy(-\d+)?$/, "");
  let newSlug = `${baseSlug}-copy`;
  const { data: existing } = await supabase.from("events").select("id").eq("slug", newSlug).maybeSingle();
  if (existing) newSlug = `${baseSlug}-copy-${Date.now().toString(36)}`;

  const { data: newEvent, error: insertEventError } = await supabase
    .from("events")
    .insert({
      title: `${event.title} (Copy)`,
      slug: newSlug,
      description: event.description,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      timezone: event.timezone,
      show_contact: event.show_contact,
      allow_swap: event.allow_swap,
      allow_waitlist: event.allow_waitlist,
      max_signups_per_participant: event.max_signups_per_participant,
      notify_email: event.notify_email,
      created_by: user.id,
    })
    .select("id, slug")
    .single();

  if (insertEventError) return NextResponse.json({ error: insertEventError.message }, { status: 500 });

  const { data: slots } = await supabase.from("slots").select("starts_at, ends_at, label, capacity, sort_order").eq("event_id", id).order("sort_order");
  if (slots?.length) {
    const newSlots = slots.map((s) => ({
      event_id: newEvent.id,
      starts_at: s.starts_at,
      ends_at: s.ends_at,
      label: s.label,
      capacity: s.capacity,
      sort_order: s.sort_order,
    }));
    await supabase.from("slots").insert(newSlots);
  }

  return NextResponse.json({ ok: true, id: newEvent.id, slug: newEvent.slug });
}
