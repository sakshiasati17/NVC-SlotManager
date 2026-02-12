"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { AddToCalendarLinks } from "@/components/add-to-calendar-links";

type Item = {
  id: string;
  eventTitle: string;
  eventSlug: string;
  allowSwap?: boolean;
  slotStart?: string;
  slotEnd?: string;
  slotLabel?: string | null;
  isPast?: boolean;
};

export function MyBookingsList({ list, pastList }: { list: Item[]; pastList?: Item[] }) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function handleCancel(bookingId: string) {
    if (!confirm("Cancel this booking?")) return;
    setCancellingId(bookingId);
    const res = await fetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
    setCancellingId(null);
    if (res.ok) router.refresh();
  }

  if (list.length === 0 && (!pastList || pastList.length === 0)) {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] p-8 text-center">
        <p className="text-[var(--muted)]">You have no confirmed bookings.</p>
        <p className="text-sm text-[var(--muted)] mt-2">
          <Link href="/" className="text-[var(--accent)] hover:underline">See open events</Link> to sign up for a slot.
        </p>
      </div>
    );
  }

  const renderItem = (item: Item) => (
    <li
      key={item.id}
      className={`rounded-[var(--radius)] border border-[var(--card-border)] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${item.isPast ? "bg-[var(--card)]/60 text-[var(--muted)]" : "bg-[var(--card)]"}`}
    >
          <div className="min-w-0">
            <Link
              href={`/e/${item.eventSlug}`}
              className="font-medium text-[var(--foreground)] hover:text-[var(--accent)] hover:underline"
            >
              {item.eventTitle}
            </Link>
            <p className="text-sm text-[var(--muted)] mt-0.5">
              {item.slotStart && item.slotEnd
                ? `${format(new Date(item.slotStart), "EEE, MMM d 'at' h:mm a")} – ${format(new Date(item.slotEnd), "h:mm a")}`
                : "—"}
              {item.slotLabel && ` · ${item.slotLabel}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0 items-center">
            <AddToCalendarLinks
              bookingId={item.id}
              eventTitle={item.eventTitle}
              eventSlug={item.eventSlug}
              slotStart={item.slotStart}
              slotEnd={item.slotEnd}
              slotLabel={item.slotLabel}
            />
            <Link
              href={`/e/${item.eventSlug}`}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card)] transition-colors"
            >
              View event
            </Link>
            {!item.isPast && item.allowSwap && (
              <Link
                href={`/e/${item.eventSlug}/swap`}
                className="rounded-lg border border-[var(--accent)] bg-transparent px-3 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-light)] transition-colors"
              >
                Request swap
              </Link>
            )}
            {!item.isPast && (
              <button
                type="button"
                onClick={() => handleCancel(item.id)}
                disabled={!!cancellingId}
                className="rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-3 py-2 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition-colors"
              >
                {cancellingId === item.id ? "…" : "Cancel"}
              </button>
            )}
          </div>
    </li>
  );

  return (
    <div className="space-y-8">
      {list.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">Upcoming</h2>
          <p className="text-xs text-[var(--muted)] mb-2">Times are shown in your local timezone.</p>
          <ul className="space-y-3">{list.map((item) => renderItem({ ...item, isPast: false }))}</ul>
        </section>
      )}
      {pastList && pastList.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">Past</h2>
          <ul className="space-y-3">{pastList.map((item) => renderItem({ ...item, isPast: true }))}</ul>
        </section>
      )}
    </div>
  );
}
