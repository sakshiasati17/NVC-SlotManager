import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAllowedAdmin } from "@/lib/admin-access";

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime().optional(),
  timezone: z.string().default("UTC"),
  show_contact: z.boolean().default(true),
  allow_swap: z.boolean().default(true),
  allow_waitlist: z.boolean().default(true),
  max_signups_per_participant: z.number().int().min(1).default(1),
});

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await isAllowedAdmin();
  if (!allowed) {
    return NextResponse.json(
      { error: "Admin access is restricted to I&E staff. Your request has been sent for approval." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(parsed.error.flatten(), { status: 400 });

  const { data, error } = await supabase
    .from("events")
    .insert({
      ...parsed.data,
      created_by: user.id,
    })
    .select("id, slug, title, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
