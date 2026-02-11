"use client";

import { buildGoogleCalendarUrl, buildOutlookUrl } from "@/lib/calendar-links";

type Props = {
  bookingId: string;
  eventTitle: string;
  eventSlug: string;
  slotStart?: string;
  slotEnd?: string;
  slotLabel?: string | null;
};

export function AddToCalendarLinks({ bookingId, eventTitle, eventSlug, slotStart, slotEnd }: Props) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const icsUrl = `${baseUrl}/api/bookings/${bookingId}/ical`;
  const hasTimes = slotStart && slotEnd;
  const eventUrl = `${baseUrl}/e/${eventSlug}`;
  const googleUrl = hasTimes
    ? buildGoogleCalendarUrl({ title: eventTitle, start: slotStart, end: slotEnd, description: eventUrl })
    : null;
  const outlookUrl = hasTimes
    ? buildOutlookUrl({ title: eventTitle, start: slotStart, end: slotEnd, description: eventUrl })
    : null;

  return (
    <div className="flex flex-wrap gap-2">
      {googleUrl && (
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card)] transition-colors"
        >
          Google Calendar
        </a>
      )}
      {outlookUrl && (
        <a
          href={outlookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card)] transition-colors"
        >
          Outlook
        </a>
      )}
      <a
        href={icsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card)] transition-colors"
      >
        {hasTimes ? "Apple / .ics" : "Add to calendar"}
      </a>
    </div>
  );
}
