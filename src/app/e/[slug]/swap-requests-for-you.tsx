"use client";

import { useEffect, useState } from "react";

type PendingSwap = {
  id: string;
  event_id: string;
  requester_name: string;
  requester_email?: string;
  requester_slot: string;
  your_slot: string;
  created_at: string;
};

export function SwapRequestsForYou({ eventId }: { eventId: string; eventSlug: string }) {
  const [list, setList] = useState<PendingSwap[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/swap/pending?event_id=${eventId}`)
      .then((r) => r.json())
      .then((data) => { setList(Array.isArray(data) ? data : []); })
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [eventId]);

  async function respond(swapId: string, accept: boolean) {
    setRespondingId(swapId);
    try {
      const res = await fetch(`/api/swap/${swapId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      });
      if (res.ok) setList((prev) => prev.filter((s) => s.id !== swapId));
    } finally {
      setRespondingId(null);
    }
  }

  if (loading || list.length === 0) return null;

  return (
    <div className="rounded-[var(--radius)] border border-[var(--accent)]/50 bg-[var(--accent-light)]/30 p-4 mt-6">
      <h2 className="font-semibold text-[var(--foreground)] mb-2">Swap requests for you</h2>
      <p className="text-sm text-[var(--muted)] mb-3">Someone wants to swap slots with you. Accept or decline.</p>
      <ul className="space-y-3">
        {list.map((s) => (
          <li key={s.id} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3 text-sm">
            <p className="font-medium text-[var(--foreground)]">{s.requester_name}</p>
            <p className="text-[var(--muted)]">Their slot: {s.requester_slot}</p>
            <p className="text-[var(--muted)]">Your slot: {s.your_slot}</p>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => respond(s.id, true)}
                disabled={!!respondingId}
                className="rounded-lg bg-[var(--accent)] text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              >
                {respondingId === s.id ? "…" : "Accept"}
              </button>
              <button
                type="button"
                onClick={() => respond(s.id, false)}
                disabled={!!respondingId}
                className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
