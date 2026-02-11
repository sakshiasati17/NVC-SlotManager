import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  notify_email: z.string().email().optional().or(z.literal("")),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: event } = await supabase.from("events").select("id, created_by").eq("id", id).single();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: role } = await supabase.from("event_roles").select("role").eq("event_id", id).eq("user_id", user.id).maybeSingle();
  const canManage = event.created_by === user.id || (role && (role.role === "admin" || role.role === "coordinator"));
  if (!canManage) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(parsed.error.flatten(), { status: 400 });

  const notify_email = parsed.data.notify_email?.trim() ? parsed.data.notify_email.trim() : null;
  const { error: updateError } = await supabase.from("events").update({ notify_email }).eq("id", id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: event } = await supabase.from("events").select("id, created_by").eq("id", id).single();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: role } = await supabase.from("event_roles").select("role").eq("event_id", id).eq("user_id", user.id).maybeSingle();
  const canManage = event.created_by === user.id || (role && (role.role === "admin" || role.role === "coordinator"));
  if (!canManage) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { error: deleteError } = await supabase.from("events").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
