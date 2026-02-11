"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useState } from "react";

type EventRow = { id: string; title: string; slug: string; starts_at: string; created_at: string };

export function AdminEventList({ events }: { events: EventRow[] }) {
  const [showCreate, setShowCreate] = useState(false);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={() => setShowCreate((s) => !s)}
          className="rounded-[var(--radius)] bg-[var(--accent)] text-white font-medium px-4 py-2 hover:bg-[var(--accent-hover)] transition-colors"
        >
          {showCreate ? "Cancel" : "Create event"}
        </button>
      </div>

      {showCreate && <CreateEventForm onDone={() => setShowCreate(false)} />}

      <ul className="space-y-3">
        {events.map((ev) => (
          <li
            key={ev.id}
            className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-[var(--shadow)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <p className="font-medium text-[var(--foreground)]">{ev.title}</p>
              <p className="text-sm text-[var(--muted)]">
                {format(new Date(ev.starts_at), "MMM d, yyyy")} · /e/{ev.slug}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`${baseUrl}/e/${ev.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm font-medium hover:bg-[var(--card-border)] transition-colors"
              >
                View schedule
              </a>
              <Link
                href={`/admin/events/${ev.id}`}
                className="rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
              >
                Manage
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {events.length === 0 && !showCreate && (
        <p className="text-center text-[var(--muted)] py-8">No events yet. Create one above.</p>
      )}
    </div>
  );
}

function CreateEventForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: slug || title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
          starts_at: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create event");
        return;
      }
      onDone();
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow)] space-y-4">
      <h2 className="font-semibold text-[var(--foreground)]">New event</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">URL slug (e.g. team-standup)</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder={title ? title.toLowerCase().replace(/\s+/g, "-") : "my-event"}
          className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Event date</label>
        <input
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[var(--accent)] text-white px-4 py-2 font-medium disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create event"}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-[var(--card-border)] px-4 py-2">
          Cancel
        </button>
      </div>
    </form>
  );
}
