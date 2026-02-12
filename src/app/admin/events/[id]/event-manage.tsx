"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { addMinutes } from "date-fns";
import { formatSlotTimeInZone, TIMEZONE_OPTIONS } from "@/lib/format-timezone";

type Event = { id: string; title: string; slug: string; allow_swap: boolean; allow_waitlist: boolean };
type Slot = {
  id: string;
  starts_at: string;
  ends_at: string;
  label: string | null;
  status: "available" | "taken";
  participant_name: string | null;
  participant_email: string | null;
};
type Stats = { total: number; available: number; taken: number };

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventManage({
  event,
  slots: initialSlots,
  stats,
}: {
  event: Event;
  slots: Slot[];
  stats: Stats;
}) {
  const [slots] = useState(initialSlots);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [oneSlotOpen, setOneSlotOpen] = useState(false);
  const [fewSlotsOpen, setFewSlotsOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLog, setAuditLog] = useState<{ action: string; resource_type: string; created_at: string; details: unknown }[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkForm, setBulkForm] = useState({ start: "", end: "", duration_minutes: "30", label_template: "" });
  const [oneSlotForm, setOneSlotForm] = useState({ start: "", end: "", label: "" });
  const [fewSlotsForm, setFewSlotsForm] = useState({ start: "", count: "4", duration_minutes: "30", label_template: "" });
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailMode, setEmailMode] = useState<"all_booked" | "invite_list">("all_booked");
  const [allBookedForm, setAllBookedForm] = useState({
    subject: "",
    body: "",
  });
  const [inviteListForm, setInviteListForm] = useState({ emailsText: "", customMessage: "" });
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [displayTimeZone, setDisplayTimeZone] = useState("");
  const [editSlot, setEditSlot] = useState<Slot | null>(null);
  const [editForm, setEditForm] = useState({ start: "", end: "", label: "" });
  const [duplicateSlot, setDuplicateSlot] = useState<Slot | null>(null);
  const [duplicateNewStart, setDuplicateNewStart] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [analytics, setAnalytics] = useState<{
    signups: number;
    cancels: number;
    swap_requested: number;
    swap_accepted: number;
    swap_declined: number;
    cancel_rate: number;
    swap_accept_rate: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/events/${event.id}/analytics`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setAnalytics(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [event.id]);

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

  async function addOneSlot() {
    if (!oneSlotForm.start || !oneSlotForm.end) {
      alert("Set start and end time.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          starts_at: new Date(oneSlotForm.start).toISOString(),
          ends_at: new Date(oneSlotForm.end).toISOString(),
          label: oneSlotForm.label.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setOneSlotOpen(false);
      setOneSlotForm({ start: "", end: "", label: "" });
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function addFewSlots() {
    const count = Math.min(20, Math.max(2, Number(fewSlotsForm.count) || 4));
    const startDate = new Date(fewSlotsForm.start);
    const durationMin = Number(fewSlotsForm.duration_minutes) || 30;
    const endDate = addMinutes(startDate, count * durationMin);
    setLoading(true);
    try {
      const res = await fetch("/api/slots/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          duration_minutes: durationMin,
          label_template: fewSlotsForm.label_template || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setFewSlotsOpen(false);
      setFewSlotsForm({ start: "", count: "4", duration_minutes: "30", label_template: "" });
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

  function openEdit(slot: Slot) {
    setEditSlot(slot);
    setEditForm({
      start: toDatetimeLocal(slot.starts_at),
      end: toDatetimeLocal(slot.ends_at),
      label: slot.label ?? "",
    });
    setDuplicateSlot(null);
  }

  function openDuplicate(slot: Slot) {
    setDuplicateSlot(slot);
    setDuplicateNewStart(toDatetimeLocal(slot.starts_at));
    setEditSlot(null);
  }

  async function submitEdit() {
    if (!editSlot) return;
    if (!editForm.start || !editForm.end) {
      alert("Set start and end time.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/slots/${editSlot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          starts_at: new Date(editForm.start).toISOString(),
          ends_at: new Date(editForm.end).toISOString(),
          label: editForm.label.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setEditSlot(null);
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function submitDuplicate() {
    if (!duplicateSlot) return;
    if (!duplicateNewStart) {
      alert("Set the new start time.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/slots/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: duplicateSlot.id,
          new_starts_at: new Date(duplicateNewStart).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setDuplicateSlot(null);
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setActionLoading(false);
    }
  }

  function exportCsv() {
    window.open(`/api/admin/events/${event.id}/export`, "_blank");
  }

  async function sendEmailAllBooked() {
    if (!allBookedForm.subject.trim() || !allBookedForm.body.trim()) {
      alert("Subject and message are required.");
      return;
    }
    setEmailSending(true);
    setEmailResult(null);
    try {
      const res = await fetch(`/api/admin/events/${event.id}/email-participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "all_booked",
          subject: allBookedForm.subject.trim(),
          body: allBookedForm.body.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setEmailResult({ sent: data.sent, failed: data.failed ?? 0, total: data.total });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setEmailSending(false);
    }
  }

  async function sendEmailInviteList() {
    const emails = inviteListForm.emailsText
      .split(/[\n,]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && e.includes("@"));
    if (emails.length === 0) {
      alert("Enter at least one valid email (one per line or comma-separated).");
      return;
    }
    if (emails.length > 500) {
      alert("Maximum 500 emails per send.");
      return;
    }
    setEmailSending(true);
    setEmailResult(null);
    try {
      const res = await fetch(`/api/admin/events/${event.id}/email-participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "invite_list",
          emails,
          customMessage: inviteListForm.customMessage.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setEmailResult({ sent: data.sent, failed: data.failed ?? 0, total: data.total });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setEmailSending(false);
    }
  }

  const eventUrl = typeof window !== "undefined" ? `${window.location.origin}/e/${event.slug}` : "";

  return (
    <div className="space-y-8">
      {/* Event summary */}
      <section className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm">
        <h1 className="text-xl font-bold text-[var(--foreground)] mb-1">{event.title}</h1>
        <p className="text-sm text-[var(--muted)] mb-4">Share this link only with participants for this event. They will only see this event and its slots, and can sign in to book, cancel, or request a swap.</p>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/e/${event.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] font-medium underline break-all"
          >
            {eventUrl || `/e/${event.slug}`}
          </a>
          <button
            type="button"
            onClick={() => {
              if (eventUrl) navigator.clipboard.writeText(eventUrl);
            }}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card)] transition-colors"
          >
            Copy link
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
          <span>Swaps {event.allow_swap ? "on" : "off"}</span>
          <span>Waitlist {event.allow_waitlist ? "on" : "off"}</span>
        </div>
      </section>

      {/* Slot stats */}
      <section className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Slot overview</h2>
        <div className="flex flex-wrap gap-6">
          <div>
            <span className="text-2xl font-bold text-[var(--foreground)]">{stats.total}</span>
            <span className="text-sm text-[var(--muted)] ml-1.5">total slots</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.available}</span>
            <span className="text-sm text-[var(--muted)] ml-1.5">available</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.taken}</span>
            <span className="text-sm text-[var(--muted)] ml-1.5">taken</span>
          </div>
        </div>
        {stats.total === 0 && (
          <p className="text-sm text-[var(--muted)] mt-3">Add slots below so participants can sign up.</p>
        )}
      </section>

      {/* Analytics */}
      <section className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Analytics</h2>
        {analytics === null ? (
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-semibold text-[var(--foreground)]">{analytics.signups}</span>
              <span className="text-[var(--muted)] ml-1">signups</span>
            </div>
            <div>
              <span className="font-semibold text-[var(--foreground)]">{analytics.cancels}</span>
              <span className="text-[var(--muted)] ml-1">cancellations</span>
              {analytics.signups > 0 && (
                <span className="text-[var(--muted)] ml-1">({analytics.cancel_rate}% rate)</span>
              )}
            </div>
            <div>
              <span className="font-semibold text-[var(--foreground)]">{analytics.swap_requested}</span>
              <span className="text-[var(--muted)] ml-1">swap requests</span>
            </div>
            <div>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{analytics.swap_accepted}</span>
              <span className="text-[var(--muted)] ml-1">accepted</span>
            </div>
            <div>
              <span className="font-semibold text-[var(--muted)]">{analytics.swap_declined}</span>
              <span className="text-[var(--muted)] ml-1">declined</span>
            </div>
            {analytics.swap_accepted + analytics.swap_declined > 0 && (
              <div>
                <span className="font-semibold text-[var(--foreground)]">{analytics.swap_accept_rate}%</span>
                <span className="text-[var(--muted)] ml-1">swap accept rate</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Actions */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Add or manage slots</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setOneSlotOpen(false); setFewSlotsOpen(false); setBulkOpen((o) => !o); }}
            className="rounded-[var(--radius)] bg-[var(--accent)] text-white font-medium px-4 py-2 hover:bg-[var(--accent-hover)] transition-colors"
          >
            {bulkOpen ? "Cancel" : "Bulk generate slots"}
          </button>
          <button
            type="button"
            onClick={() => { setBulkOpen(false); setFewSlotsOpen(false); setOneSlotOpen((o) => !o); }}
            className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] font-medium px-4 py-2 hover:bg-[var(--background)] transition-colors"
          >
            {oneSlotOpen ? "Cancel" : "Add one slot"}
          </button>
          <button
            type="button"
            onClick={() => { setBulkOpen(false); setOneSlotOpen(false); setFewSlotsOpen((o) => !o); }}
            className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] font-medium px-4 py-2 hover:bg-[var(--background)] transition-colors"
          >
            {fewSlotsOpen ? "Cancel" : "Add a few slots (3–4)"}
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
          <button
            type="button"
            onClick={() => { setEmailOpen((o) => !o); setEmailResult(null); }}
            className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] font-medium px-4 py-2 hover:bg-[var(--background)] transition-colors"
          >
            {emailOpen ? "Cancel" : "Email participants"}
          </button>
        </div>
      </section>

      {emailOpen && (
        <section className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-[var(--foreground)]">Email participants</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEmailMode("all_booked")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${emailMode === "all_booked" ? "bg-[var(--accent)] text-white" : "border border-[var(--card-border)] bg-[var(--background)]"}`}
            >
              Email all confirmed ({stats.taken})
            </button>
            <button
              type="button"
              onClick={() => setEmailMode("invite_list")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${emailMode === "invite_list" ? "bg-[var(--accent)] text-white" : "border border-[var(--card-border)] bg-[var(--background)]"}`}
            >
              Send booking link to a list
            </button>
          </div>

          {emailMode === "all_booked" ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted)]">
                Send one email to each person who has a confirmed slot. You can use: {"{{event_title}}"}, {"{{event_link}}"}, {"{{participant_name}}"}, {"{{participant_email}}"}.
              </p>
              {stats.taken === 0 ? (
                <p className="text-sm text-[var(--muted)]">No confirmed participants yet.</p>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Subject</label>
                    <input
                      type="text"
                      value={allBookedForm.subject}
                      onChange={(e) => setAllBookedForm((f) => ({ ...f, subject: e.target.value }))}
                      placeholder={`Update: ${event.title}`}
                      className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Message</label>
                    <textarea
                      value={allBookedForm.body}
                      onChange={(e) => setAllBookedForm((f) => ({ ...f, body: e.target.value }))}
                      placeholder={`Hi {{participant_name}},\n\nReminder about {{event_title}}. View your booking: {{event_link}}`}
                      rows={5}
                      className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={sendEmailAllBooked}
                    disabled={emailSending}
                    className="rounded-lg bg-[var(--accent)] text-white px-4 py-2 font-medium disabled:opacity-50"
                  >
                    {emailSending ? "Sending…" : `Email ${stats.taken} participant(s)`}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted)]">
                Send the event booking link to a list of emails (e.g. paste from a spreadsheet). Each person gets an invite to book a slot. Optional message is included.
              </p>
              <div>
                <label className="block text-sm font-medium mb-1">Email addresses (one per line or comma-separated)</label>
                <textarea
                  value={inviteListForm.emailsText}
                  onChange={(e) => setInviteListForm((f) => ({ ...f, emailsText: e.target.value }))}
                  placeholder="alice@example.com\nbob@example.com"
                  rows={6}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Optional message (included in the email)</label>
                <textarea
                  value={inviteListForm.customMessage}
                  onChange={(e) => setInviteListForm((f) => ({ ...f, customMessage: e.target.value }))}
                  placeholder="e.g. Please book your slot by Friday."
                  rows={2}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
                />
              </div>
              <button
                type="button"
                onClick={sendEmailInviteList}
                disabled={emailSending || !inviteListForm.emailsText.trim()}
                className="rounded-lg bg-[var(--accent)] text-white px-4 py-2 font-medium disabled:opacity-50"
              >
                {emailSending ? "Sending…" : "Send invite emails"}
              </button>
            </div>
          )}

          {emailResult && (
            <p className="text-sm text-[var(--muted)]">
              Sent: {emailResult.sent}, failed: {emailResult.failed}, total: {emailResult.total}
            </p>
          )}
        </section>
      )}

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

      {oneSlotOpen && (
        <div className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow)] space-y-4">
          <h2 className="font-semibold text-[var(--foreground)]">Add one slot</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start</label>
              <input
                type="datetime-local"
                value={oneSlotForm.start}
                onChange={(e) => setOneSlotForm((f) => ({ ...f, start: e.target.value }))}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End</label>
              <input
                type="datetime-local"
                value={oneSlotForm.end}
                onChange={(e) => setOneSlotForm((f) => ({ ...f, end: e.target.value }))}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Label (optional)</label>
              <input
                type="text"
                placeholder="e.g. Morning session"
                value={oneSlotForm.label}
                onChange={(e) => setOneSlotForm((f) => ({ ...f, label: e.target.value }))}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={addOneSlot}
            disabled={loading || !oneSlotForm.start || !oneSlotForm.end}
            className="rounded-lg bg-[var(--accent)] text-white px-4 py-2 font-medium disabled:opacity-50"
          >
            {loading ? "Adding…" : "Add slot"}
          </button>
        </div>
      )}

      {fewSlotsOpen && (
        <div className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow)] space-y-4">
          <h2 className="font-semibold text-[var(--foreground)]">Add a few slots</h2>
          <p className="text-sm text-[var(--muted)]">Generate 2–20 consecutive slots from a start time. Good for 3–4 or more slots without setting an end time.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First slot start</label>
              <input
                type="datetime-local"
                value={fewSlotsForm.start}
                onChange={(e) => setFewSlotsForm((f) => ({ ...f, start: e.target.value }))}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Number of slots</label>
              <input
                type="number"
                min={2}
                max={20}
                value={fewSlotsForm.count}
                onChange={(e) => setFewSlotsForm((f) => ({ ...f, count: e.target.value }))}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duration per slot (minutes)</label>
              <input
                type="number"
                min={5}
                max={480}
                value={fewSlotsForm.duration_minutes}
                onChange={(e) => setFewSlotsForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Label template (optional, use {"{{n}}"} for number)</label>
              <input
                type="text"
                placeholder={'Slot {{n}}'}
                value={fewSlotsForm.label_template}
                onChange={(e) => setFewSlotsForm((f) => ({ ...f, label_template: e.target.value }))}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={addFewSlots}
            disabled={loading || !fewSlotsForm.start}
            className="rounded-lg bg-[var(--accent)] text-white px-4 py-2 font-medium disabled:opacity-50"
          >
            {loading ? "Creating…" : `Create ${Math.min(20, Math.max(2, Number(fewSlotsForm.count) || 4))} slots`}
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

      {editSlot && (
        <div className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow)] space-y-4">
          <h2 className="font-semibold text-[var(--foreground)]">Edit slot</h2>
          <p className="text-sm text-[var(--muted)]">Change time or label for this slot.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start</label>
              <input
                type="datetime-local"
                value={editForm.start}
                onChange={(e) => setEditForm((f) => ({ ...f, start: e.target.value }))}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End</label>
              <input
                type="datetime-local"
                value={editForm.end}
                onChange={(e) => setEditForm((f) => ({ ...f, end: e.target.value }))}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Label (optional)</label>
              <input
                type="text"
                placeholder="e.g. Morning session"
                value={editForm.label}
                onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submitEdit}
              disabled={actionLoading || !editForm.start || !editForm.end}
              className="rounded-lg bg-[var(--accent)] text-white px-4 py-2 font-medium disabled:opacity-50"
            >
              {actionLoading ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditSlot(null)}
              className="rounded-lg border border-[var(--card-border)] px-4 py-2 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {duplicateSlot && (
        <div className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow)] space-y-4">
          <h2 className="font-semibold text-[var(--foreground)]">Duplicate slot</h2>
          <p className="text-sm text-[var(--muted)]">Create a new slot with the same duration and label at a different time.</p>
          <div>
            <label className="block text-sm font-medium mb-1">New start time</label>
            <input
              type="datetime-local"
              value={duplicateNewStart}
              onChange={(e) => setDuplicateNewStart(e.target.value)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submitDuplicate}
              disabled={actionLoading || !duplicateNewStart}
              className="rounded-lg bg-[var(--accent)] text-white px-4 py-2 font-medium disabled:opacity-50"
            >
              {actionLoading ? "Creating…" : "Create duplicate"}
            </button>
            <button
              type="button"
              onClick={() => setDuplicateSlot(null)}
              className="rounded-lg border border-[var(--card-border)] px-4 py-2 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Slots table */}
      <section className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-[var(--card-border)] bg-[var(--background)]/50 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-[var(--foreground)]">
            All slots · {stats.total} total ({stats.available} available, {stats.taken} taken)
          </h2>
          <div className="flex items-center gap-2">
            <label htmlFor="admin-timezone" className="text-sm text-[var(--muted)]">
              Show times in:
            </label>
            <select
              id="admin-timezone"
              value={displayTimeZone}
              onChange={(e) => setDisplayTimeZone(e.target.value)}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-sm text-[var(--foreground)]"
            >
              {TIMEZONE_OPTIONS.map((opt) => (
                <option key={opt.value || "local"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {slots.length === 0 ? (
          <div className="p-8 text-center text-[var(--muted)] text-sm">
            No slots yet. Use “Bulk generate slots”, “Add one slot”, or “Add a few slots” above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] text-left text-[var(--muted)]">
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Label</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Participant</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot.id} className="border-b border-[var(--card-border)] last:border-0">
                    <td className="px-4 py-3 text-[var(--foreground)] whitespace-nowrap">
                      {formatSlotTimeInZone(slot.starts_at, slot.ends_at, displayTimeZone)}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">{slot.label ?? "—"}</td>
                    <td className="px-4 py-3">
                      {slot.status === "taken" ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-xs font-medium">
                          Taken
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-xs font-medium">
                          Available
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {slot.status === "taken"
                        ? (slot.participant_name?.trim() || slot.participant_email || "—")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(slot)}
                          className="rounded border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--card)]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDuplicate(slot)}
                          className="rounded border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--card)]"
                        >
                          Duplicate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
