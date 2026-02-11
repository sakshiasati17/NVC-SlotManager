"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { EventWithSlots } from "@/lib/types";

export function EventSchedule({ event: initialEvent }: { event: EventWithSlots }) {
  const [event, setEvent] = useState(initialEvent);
  const [loadingSlotId, setLoadingSlotId] = useState<string | null>(null);
  const [signupForm, setSignupForm] = useState<{ slotId: string; email: string; name: string; phone: string; joinWaitlist?: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const showContact = event.show_contact;

  async function handleSignup(slotId: string, joinWaitlist?: boolean) {
    const email = signupForm?.slotId === slotId ? signupForm.email : "";
    const name = signupForm?.slotId === slotId ? signupForm.name : "";
    const phone = signupForm?.slotId === slotId ? signupForm.phone : "";
    if (!email) {
      setSignupForm({ slotId, email: "", name, phone, joinWaitlist });
      return;
    }
    setLoadingSlotId(slotId);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: slotId,
          event_id: event.id,
          participant_email: email,
          participant_name: name || undefined,
          participant_phone: phone || undefined,
          join_waitlist: joinWaitlist ?? false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Signup failed");
        return;
      }
      setMessage(data.waitlist ? "You're on the waitlist." : "You're signed up!");
      setSignupForm(null);
      await refreshSchedule();
    } finally {
      setLoadingSlotId(null);
    }
  }

  async function handleCancel(bookingId: string) {
    if (!confirm("Cancel your signup?")) return;
    setError(null);
    const res = await fetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not cancel");
      return;
    }
    setMessage("Signup cancelled.");
    await refreshSchedule();
  }

  async function refreshSchedule() {
    const res = await fetch(`/api/events/${event.slug}`);
    if (res.ok) {
      const data = await res.json();
      setEvent(data);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-[var(--radius)] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-[var(--radius)] bg-[var(--accent-light)] border border-[var(--accent)]/30 text-[var(--accent)] dark:text-teal-300 px-4 py-3 text-sm">
          {message}
        </div>
      )}

      <ul className="space-y-3" role="list">
        {event.slots.map((slot) => {
          const booking = slot.booking;
          const isFormOpen = signupForm?.slotId === slot.id;
          const isLoading = loadingSlotId === slot.id;

          return (
            <li
              key={slot.id}
              className="rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--shadow)] overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--foreground)]">
                    {format(new Date(slot.starts_at), "EEE, MMM d")} · {format(new Date(slot.starts_at), "h:mm a")} – {format(new Date(slot.ends_at), "h:mm a")}
                  </p>
                  {slot.label && <p className="text-sm text-[var(--muted)]">{slot.label}</p>}
                </div>

                <div className="flex-1 sm:text-right">
                  {booking ? (
                    <div>
                      <p className="font-medium text-[var(--foreground)]">
                        {booking.participant_name || booking.participant_email}
                        {booking.team?.name && ` (${booking.team.name})`}
                      </p>
                      {showContact && (
                        <p className="text-sm text-[var(--muted)]">
                          {booking.participant_email}
                          {booking.participant_phone && ` · ${booking.participant_phone}`}
                        </p>
                      )}
                      {slot.waitlist_count > 0 && (
                        <p className="text-xs text-[var(--muted)] mt-1">{slot.waitlist_count} on waitlist</p>
                      )}
                      {event.allow_waitlist && (
                        isFormOpen && signupForm?.joinWaitlist ? (
                          <div className="mt-2 flex flex-col gap-2 w-full max-w-xs">
                            <input
                              type="email"
                              placeholder="Your email *"
                              value={signupForm.email}
                              onChange={(e) => setSignupForm((f) => f ? { ...f, email: e.target.value } : null)}
                              className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Your name"
                              value={signupForm.name}
                              onChange={(e) => setSignupForm((f) => f ? { ...f, name: e.target.value } : null)}
                              className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleSignup(slot.id, true)}
                                disabled={isLoading || !signupForm.email}
                                className="rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-sm font-medium disabled:opacity-50"
                              >
                                {isLoading ? "..." : "Join waitlist"}
                              </button>
                              <button type="button" onClick={() => setSignupForm(null)} className="rounded-lg border px-3 py-2 text-sm">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSignupForm({ slotId: slot.id, email: "", name: "", phone: "", joinWaitlist: true })}
                            className="mt-2 rounded-lg border border-[var(--accent)] text-[var(--accent)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--accent-light)] transition-colors"
                          >
                            Join waitlist
                          </button>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="text-[var(--muted)]">Open</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {booking ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleCancel(booking.id)}
                        className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card-border)] transition-colors"
                      >
                        Cancel (if yours)
                      </button>
                      {event.allow_swap && (
                        <a
                          href={`/e/${event.slug}/swap?target=${booking.id}`}
                          className="rounded-lg border border-[var(--accent)] bg-transparent px-3 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-light)] transition-colors"
                        >
                          Request swap
                        </a>
                      )}
                    </>
                  ) : (
                    <>
                      {!isFormOpen ? (
                        <button
                          type="button"
                          onClick={() => setSignupForm({ slotId: slot.id, email: "", name: "", phone: "" })}
                          className="rounded-lg bg-[var(--accent)] text-white px-4 py-2 text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
                        >
                          Sign up
                        </button>
                      ) : (
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                          <input
                            type="email"
                            placeholder="Your email *"
                            value={signupForm.email}
                            onChange={(e) => setSignupForm((f) => f ? { ...f, email: e.target.value } : null)}
                            className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Your name"
                            value={signupForm.name}
                            onChange={(e) => setSignupForm((f) => f ? { ...f, name: e.target.value } : null)}
                            className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                          />
                          <input
                            type="tel"
                            placeholder="Phone (optional)"
                            value={signupForm.phone}
                            onChange={(e) => setSignupForm((f) => f ? { ...f, phone: e.target.value } : null)}
                            className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSignup(slot.id, signupForm.joinWaitlist)}
                              disabled={isLoading || !signupForm.email}
                              className="rounded-lg bg-[var(--accent)] text-white px-4 py-2 text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
                            >
                              {isLoading ? "..." : signupForm.joinWaitlist ? "Join waitlist" : "Confirm"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSignupForm(null)}
                              className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {event.slots.length === 0 && (
        <p className="text-center text-[var(--muted)] py-8">No slots yet. The organizer will add them soon.</p>
      )}
    </div>
  );
}
