"use client";

import { useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Booking = { id: string; slot_id: string; participant_name: string | null; participant_email: string };
type Slot = { id: string; starts_at: string; ends_at: string };
type Event = { id: string; title: string; slug: string };

export default function SwapPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const targetBookingId = searchParams.get("target");
  const slug = (pathname?.split("/")[2] ?? "") as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    const res = await fetch(`/api/events/${slug}`);
    if (!res.ok) return;
    const data = await res.json();
    setEvent(data);
    setSlots(data.slots ?? []);
    const withBookings = (data.slots ?? []).filter((s: { booking: unknown }) => s.booking);
    setBookings(withBookings.map((s: { booking: Booking }) => s.booking));
  }, [slug]);

  useEffect(() => {
    load();
    setLoading(false);
  }, [load]);

  const targetBooking = bookings.find((b) => b.id === targetBookingId);
  const targetSlot = targetBooking && slots.find((s) => s.id === targetBooking.slot_id);

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
        {targetBooking && targetSlot && (
          <p className="text-[var(--muted)] mb-6">
            You want to swap into the slot held by <strong>{targetBooking.participant_name || targetBooking.participant_email}</strong>:{" "}
            {new Date(targetSlot.starts_at).toLocaleString()} – {new Date(targetSlot.ends_at).toLocaleTimeString()}.
          </p>
        )}

        {message && (
          <div className="rounded-[var(--radius)] bg-[var(--accent-light)] border border-[var(--accent)]/30 text-[var(--accent)] px-4 py-3 text-sm mb-6">
            {message}
          </div>
        )}

        <p className="text-sm text-[var(--muted)] mb-4">Select your current booking to send a swap request:</p>
        <ul className="space-y-2">
          {bookings.filter((b) => b.id !== targetBookingId).map((b) => {
            const slot = slots.find((s) => s.id === b.slot_id);
            return (
              <li key={b.id} className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{b.participant_name || b.participant_email}</p>
                  {slot && <p className="text-sm text-[var(--muted)]">{new Date(slot.starts_at).toLocaleString()}</p>}
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

        {bookings.filter((b) => b.id !== targetBookingId).length === 0 && (
          <p className="text-[var(--muted)]">You don’t have another booking to swap from. Sign up for a slot first, then request a swap.</p>
        )}
      </main>
    </div>
  );
}
