/**
 * Build "Add to calendar" URLs for Google Calendar, Outlook, and .ics download.
 * Participants can choose according to their preference (Google, Outlook, or Apple/other via .ics).
 */

function toGoogleDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function buildGoogleCalendarUrl(params: {
  title: string;
  start: string | Date;
  end: string | Date;
  description?: string;
  location?: string;
}): string {
  const start = typeof params.start === "string" ? new Date(params.start) : params.start;
  const end = typeof params.end === "string" ? new Date(params.end) : params.end;
  const base = "https://calendar.google.com/calendar/render";
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    dates: `${toGoogleDate(start)}/${toGoogleDate(end)}`,
  });
  if (params.description) q.set("details", params.description);
  if (params.location) q.set("location", params.location);
  return `${base}?${q.toString()}`;
}

export function buildOutlookUrl(params: {
  title: string;
  start: string | Date;
  end: string | Date;
  description?: string;
}): string {
  const start = typeof params.start === "string" ? params.start : params.start.toISOString();
  const end = typeof params.end === "string" ? params.end : params.end.toISOString();
  const base = "https://outlook.office.com/calendar/0/action/compose";
  const q = new URLSearchParams({
    subject: params.title,
    startdt: start,
    enddt: end,
  });
  if (params.description) q.set("body", params.description);
  return `${base}?${q.toString()}`;
}
