/**
 * Format a date in a specific timezone for display on the event page.
 * Use timeZone = "" or null for the user's local timezone.
 */

export function getLocalTimeZone(): string {
  if (typeof Intl === "undefined" || !Intl.DateTimeFormat) return "UTC";
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatSlotTimeInZone(
  startsAt: string | Date,
  endsAt: string | Date,
  timeZone: string
): string {
  const start = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
  const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  const tz = timeZone || getLocalTimeZone();
  const dateOpt: Intl.DateTimeFormatOptions = { timeZone: tz, weekday: "short", month: "short", day: "numeric" };
  const timeOpt: Intl.DateTimeFormatOptions = { timeZone: tz, hour: "numeric", minute: "2-digit" };
  const dateStr = new Intl.DateTimeFormat("en-US", dateOpt).format(start);
  const startStr = new Intl.DateTimeFormat("en-US", timeOpt).format(start);
  const endStr = new Intl.DateTimeFormat("en-US", timeOpt).format(end);
  return `${dateStr} · ${startStr} – ${endStr}`;
}

/** Common timezones for the dropdown. First is "Your local". */
export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Your local timezone" },
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern (US)" },
  { value: "America/Chicago", label: "Central (US)" },
  { value: "America/Denver", label: "Mountain (US)" },
  { value: "America/Los_Angeles", label: "Pacific (US)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Asia/Kolkata", label: "India" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Australia/Sydney", label: "Sydney" },
];

/** Get human-readable label for a timezone value. */
export function getTimezoneLabel(tz: string): string {
  if (!tz) return "Your local timezone";
  const found = TIMEZONE_OPTIONS.find((o) => o.value === tz);
  return found ? found.label : tz;
}

/** Options for the event page: include event timezone if set and not already in list. */
export function getTimezoneOptionsForEvent(eventTimezone: string): { value: string; label: string }[] {
  const hasEventTz = eventTimezone && eventTimezone.trim();
  const inList = hasEventTz && TIMEZONE_OPTIONS.some((o) => o.value === eventTimezone);
  if (!hasEventTz || inList) return TIMEZONE_OPTIONS;
  return [
    { value: "", label: "Your local timezone" },
    { value: eventTimezone, label: `Organizer's timezone (${eventTimezone})` },
    ...TIMEZONE_OPTIONS.filter((o) => o.value !== ""),
  ];
}
