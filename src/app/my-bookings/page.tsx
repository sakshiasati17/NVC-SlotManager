import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MyBookingsList } from "./my-bookings-list";
import { SignOutButton } from "./sign-out-button";
import { SwapRequestsSection } from "./swap-requests-section";

export default async function MyBookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/my-bookings");
  }

  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      id,
      slot_id,
      event_id,
      participant_name,
      participant_email,
      event:events(id, title, slug, allow_swap),
      slot:slots(starts_at, ends_at, label)
    `)
    .eq("auth_user_id", user.id)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false });

  const now = new Date().toISOString();
  const all = (bookings ?? []).map((b) => {
    const slot = b.slot as { starts_at?: string; ends_at?: string; label?: string } | null;
    const event = b.event as { title?: string; slug?: string; allow_swap?: boolean } | null;
    return {
      id: b.id,
      eventTitle: event?.title ?? "Event",
      eventSlug: event?.slug ?? "",
      allowSwap: event?.allow_swap ?? false,
      slotStart: slot?.starts_at,
      slotEnd: slot?.ends_at,
      slotLabel: slot?.label ?? null,
      _startsAt: slot?.starts_at,
    };
  });
  const toItem = (b: (typeof all)[0]) => ({ id: b.id, eventTitle: b.eventTitle, eventSlug: b.eventSlug, allowSwap: b.allowSwap, slotStart: b.slotStart, slotEnd: b.slotEnd, slotLabel: b.slotLabel });
  const list = all.filter((b) => (b._startsAt ?? "") >= now).sort((a, b) => (a._startsAt ?? "").localeCompare(b._startsAt ?? "")).map(toItem);
  const pastList = all.filter((b) => (b._startsAt ?? "") < now).sort((a, b) => (b._startsAt ?? "").localeCompare(a._startsAt ?? "")).map(toItem);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="max-w-2xl mx-auto px-4 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-2">
          <Link href="/" className="text-xl font-semibold text-[var(--foreground)]">
            Innovation &amp; Entrepreneurship
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--muted)]">My bookings</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main id="main" className="max-w-2xl mx-auto px-4 py-6 sm:py-8" tabIndex={-1}>
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">My bookings</h1>
        <p className="text-sm text-[var(--muted)] mb-6">
          Your confirmed slots. View event to cancel; request a swap to change your slot.
        </p>
        <SwapRequestsSection />
        <MyBookingsList list={list} pastList={pastList} />
      </main>
    </div>
  );
}
