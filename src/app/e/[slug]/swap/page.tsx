"use client";

import { useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

type Booking = { id: string; slot_id: string; participant_name: string | null; participant_email: string };
type Slot = { id: string; starts_at: string; ends_at: string };
type Event = { id: string; title: string; slug: string };
type SlotWithBooking = Slot & { booking: Booking | null };
type MyBooking = { id: string; slot_id: string; participant_name: string | null; participant_email: string; starts_at?: string; ends_at?: string; label?: string | null };

export default function SwapPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const targetBookingId = searchParams.get("target");
  const slug = (pathname?.split("/")[2] ?? "") as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [allSlotsWithBooking, setAllSlotsWithBooking] = useState<SlotWithBooking[]>([]);
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return;
      const eventRes = await fetch(`/api/events/${slug}`);
      if (!eventRes.ok || cancelled) return;
      const data = await eventRes.json();
      if (cancelled) return;
      setEvent(data);
      const slotsWithBooking = data.slots ?? [];
      setAllSlotsWithBooking(slotsWithBooking);
      setSlots(slotsWithBooking.map((s: SlotWithBooking) => ({ id: s.id, starts_at: s.starts_at, ends_at: s.ends_at })));
      if (data?.id) {
        const mbRes = await fetch(`/api/bookings?event_id=${data.id}`);
        if (cancelled) return;
        if (mbRes.ok) {
          const my = await mbRes.json();
          setMyBookings(Array.isArray(my) ? my : []);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const myBookingIds = new Set(myBookings.map((b) => b.id));
  const bookings = allSlotsWithBooking.filter((s) => s.booking).map((s) => s.booking as Booking);
  const targetBooking = bookings.find((b) => b.id === targetBookingId);
  const targetSlot = targetBooking && slots.find((s) => s.id === targetBooking.slot_id);
  const takenSlotsForPick = allSlotsWithBooking.filter((s) => s.booking && !myBookingIds.has(s.booking.id));

  async function requestSwap(requesterBookingId: string) {
    if (!event || !targetBookingId) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          requester_booking_id: requesterBookingId,
          target_booking_id: targetBookingId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Request failed");
        return;
      }
      setMessage("Swap requested. The other person will get a notification to accept or decline.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <p className="text-[var(--muted)]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link href={`/e/${event.slug}`} className="text-[var(--accent)] hover:underline text-sm">← Back to schedule</Link>
          <h1 className="text-xl font-bold text-[var(--foreground)] mt-2">Request a swap</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {message && (
          <div className="rounded-[var(--radius)] bg-[var(--accent-light)] border border-[var(--accent)]/30 text-[var(--accent)] px-4 py-3 text-sm mb-6">
            {message}
          </div>
        )}

        {!targetBookingId ? (
          <>
            <p className="text-sm text-[var(--muted)] mb-4">Pick the slot you want to swap into (someone else has it). We’ll send them a request to swap.</p>
            {takenSlotsForPick.length === 0 ? (
              <p className="text-[var(--muted)]">No other slots are taken, or you don’t have a booking in this event yet. <Link href={`/e/${event.slug}`} className="text-[var(--accent)] hover:underline">View schedule</Link> to sign up.</p>
            ) : (
              <ul className="space-y-2">
                {takenSlotsForPick.map((s) => {
                  const b = s.booking!;
                  return (
                    <li key={s.id} className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] p-4">
                      <Link
                        href={`/e/${event.slug}/swap?target=${b.id}`}
                        className="flex justify-between items-center text-[var(--foreground)] hover:text-[var(--accent)]"
                      >
                        <div>
                          <p className="font-medium">Slot taken · {new Date(s.starts_at).toLocaleString()} – {new Date(s.ends_at).toLocaleTimeString()}</p>
                          <p className="text-sm text-[var(--muted)]">Request swap with this person</p>
                        </div>
                        <span className="text-[var(--accent)]">→</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <>
            {targetBooking && targetSlot && (
              <p className="text-[var(--muted)] mb-6">
                You want to swap into the slot held by <strong>{targetBooking.participant_name || targetBooking.participant_email}</strong>:{" "}
                {new Date(targetSlot.starts_at).toLocaleString()} – {new Date(targetSlot.ends_at).toLocaleTimeString()}.
              </p>
            )}

            <p className="text-sm text-[var(--muted)] mb-4">Select your current booking to send the swap request:</p>
            <ul className="space-y-2">
              {myBookings.filter((b) => b.id !== targetBookingId).map((b) => {
                const slotStr = b.starts_at && b.ends_at ? `${new Date(b.starts_at).toLocaleString()} – ${new Date(b.ends_at).toLocaleTimeString()}` : slots.find((s) => s.id === b.slot_id) ? `${new Date(slots.find((s) => s.id === b.slot_id)!.starts_at).toLocaleString()}` : "";
                return (
                  <li key={b.id} className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{b.participant_name || b.participant_email}</p>
                      {slotStr && <p className="text-sm text-[var(--muted)]">{slotStr}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => requestSwap(b.id)}
                      disabled={submitting}
                      className="rounded-lg bg-[var(--accent)] text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
                    >
                      Request swap
                    </button>
                  </li>
                );
              })}
            </ul>

            {myBookings.filter((b) => b.id !== targetBookingId).length === 0 && (
              <p className="text-[var(--muted)]">You don’t have another booking in this event to swap from. <Link href={`/e/${event.slug}`} className="text-[var(--accent)] hover:underline">View schedule</Link> to sign up for a slot first.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
