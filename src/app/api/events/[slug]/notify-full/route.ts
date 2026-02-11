import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { participantNoSlotQuery } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";

const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  message: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(parsed.error.flatten(), { status: 400 });

  const { data: event } = await supabase
    .from("events")
    .select("id, title, slug, notify_email")
    .eq("slug", slug)
    .single();

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (!event.notify_email?.trim()) {
    return NextResponse.json(
      { error: "The organizer hasn't set up a notification email. You can't send a message right now." },
      { status: 400 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const eventUrl = `${baseUrl}/e/${event.slug}`;
  const { subject, html } = participantNoSlotQuery({
    eventTitle: event.title ?? "Event",
    participantName: parsed.data.name ?? "",
    participantEmail: parsed.data.email,
    message: parsed.data.message,
    eventUrl,
  });

  await sendEmail(event.notify_email, subject, html);

  return NextResponse.json({ ok: true });
}
