"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PendingSwap = {
  id: string;
  event_id: string;
  event_title: string;
  event_slug: string;
  requester_name: string;
  requester_email?: string;
  requester_slot: string;
  your_slot: string;
  created_at: string;
};

export function SwapRequestsSection() {
  const router = useRouter();
  const [list, setList] = useState<PendingSwap[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/swap/pending")
      .then((r) => r.json())
      .then((data) => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  async function respond(swapId: string, accept: boolean) {
    setRespondingId(swapId);
    try {
      const res = await fetch(`/api/swap/${swapId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      });
      if (res.ok) {
        setList((prev) => prev.filter((s) => s.id !== swapId));
        router.refresh();
      }
    } finally {
      setRespondingId(null);
    }
  }

  if (loading || list.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">Swap requests for you</h2>
      <p className="text-sm text-[var(--muted)] mb-3">Someone wants to swap slots with you. Accept or decline.</p>
      <ul className="space-y-3">
        {list.map((s) => (
          <li key={s.id} className="rounded-[var(--radius)] border border-[var(--accent)]/50 bg-[var(--accent-light)]/30 p-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <Link href={`/e/${s.event_slug}`} className="font-medium text-[var(--accent)] hover:underline">
                  {s.event_title}
                </Link>
                <p className="text-sm text-[var(--foreground)] mt-1">{s.requester_name} wants to swap</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">Their slot: {s.requester_slot}</p>
                <p className="text-xs text-[var(--muted)]">Your slot: {s.your_slot}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => respond(s.id, true)}
                  disabled={!!respondingId}
                  className="rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {respondingId === s.id ? "…" : "Accept"}
                </button>
                <button
                  type="button"
                  onClick={() => respond(s.id, false)}
                  disabled={!!respondingId}
                  className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
