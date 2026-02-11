"use client";

import { useState } from "react";
import { format } from "date-fns";

type Event = { id: string; title: string; slug: string; allow_swap: boolean; allow_waitlist: boolean };
type Slot = { id: string; starts_at: string; ends_at: string; label: string | null };

export function EventManage({ event, slots: initialSlots }: { event: Event; slots: Slot[] }) {
  const [slots, setSlots] = useState(initialSlots);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLog, setAuditLog] = useState<{ action: string; resource_type: string; created_at: string; details: unknown }[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkForm, setBulkForm] = useState({ start: "", end: "", duration_minutes: "30", label_template: "" });

  async function bulkCreate() {
    setLoading(true);
    try {
      const res = await fetch("/api/slots/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          start: new Date(bulkForm.start).toISOString(),
          end: new Date(bulkForm.end).toISOString(),
          duration_minutes: Number(bulkForm.duration_minutes),
          label_template: bulkForm.label_template || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setBulkOpen(false);
      setBulkForm({ start: "", end: "", duration_minutes: "30", label_template: "" });
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadAudit() {
    const res = await fetch(`/api/admin/events/${event.id}/audit`);
    const data = await res.json();
    if (res.ok) setAuditLog(data);
    setAuditOpen(true);
  }

  function exportCsv() {
    window.open(`/api/admin/events/${event.id}/export`, "_blank");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setBulkOpen((o) => !o)}
          className="rounded-[var(--radius)] bg-[var(--accent)] text-white font-medium px-4 py-2 hover:bg-[var(--accent-hover)] transition-colors"
        >
          {bulkOpen ? "Cancel" : "Bulk generate slots"}
        </button>
        <button
          type="button"
          onClick={exportCsv}
          className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] font-medium px-4 py-2 hover:bg-[var(--background)] transition-colors"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={loadAudit}
          className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] font-medium px-4 py-2 hover:bg-[var(--background)] transition-colors"
        >
          Audit log
        </button>
      </div>

      {bulkOpen && (
        <div className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow)] space-y-4">
          <h2 className="font-semibold text-[var(--foreground)]">Bulk generate slots</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start</label>
              <input
                type="datetime-local"
                value={bulkForm.start}
                onChange={(e) => setBulkForm((f) => ({ ...f, start: e.target.value }))}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End</label>
              <input
                type="datetime-local"
                value={bulkForm.end}
                onChange={(e) => setBulkForm((f) => ({ ...f, end: e.target.value }))}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
              <input
                type="number"
                min={5}
                max={480}
                value={bulkForm.duration_minutes}
                onChange={(e) => setBulkForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Label template (optional, use {"{{n}}"} for number)</label>
              <input
                type="text"
                placeholder={'Slot {{n}}'}
                value={bulkForm.label_template}
                onChange={(e) => setBulkForm((f) => ({ ...f, label_template: e.target.value }))}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={bulkCreate}
            disabled={loading || !bulkForm.start || !bulkForm.end}
            className="rounded-lg bg-[var(--accent)] text-white px-4 py-2 font-medium disabled:opacity-50"
          >
            {loading ? "Creating…" : "Generate slots"}
          </button>
        </div>
      )}

      {auditOpen && (
        <div className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow)]">
          <h2 className="font-semibold text-[var(--foreground)] mb-4">Audit log</h2>
          <ul className="space-y-2 max-h-64 overflow-auto">
            {auditLog.map((entry, i) => (
              <li key={i} className="text-sm text-[var(--muted)]">
                <span className="font-medium text-[var(--foreground)]">{entry.action}</span> · {entry.resource_type} · {format(new Date(entry.created_at), "MMM d, HH:mm")}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setAuditOpen(false)} className="mt-4 rounded-lg border px-3 py-2 text-sm">Close</button>
        </div>
      )}

      <div>
        <h2 className="font-semibold text-[var(--foreground)] mb-3">Slots ({slots.length})</h2>
        <ul className="space-y-2">
          {slots.map((slot) => (
            <li key={slot.id} className="rounded-lg border border-[var(--card-border)] px-4 py-2 flex justify-between items-center">
              <span>{format(new Date(slot.starts_at), "EEE MMM d, h:mm a")} – {format(new Date(slot.ends_at), "h:mm a")}</span>
              {slot.label && <span className="text-[var(--muted)]">{slot.label}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
