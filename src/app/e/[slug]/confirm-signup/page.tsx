"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AddToCalendarLinks } from "@/components/add-to-calendar-links";

type SuccessData = {
  booking_id: string;
  event_title: string;
  slug: string;
  slot_start: string | null;
  slot_end: string | null;
};

export default function ConfirmSignupPage() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : null;
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "validating" | "completing" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (!slug || !token) {
      queueMicrotask(() => {
        setStatus("error");
        setErrorMessage("Invalid link. Use the link from your confirmation email.");
      });
      return;
    }

    const tokenVal: string = token;
    let cancelled = false;

    void (async function run() {
      setStatus("validating");
      const checkRes = await fetch(`/api/events/${slug}/confirm-signup?token=${encodeURIComponent(tokenVal)}`);
      const checkData = await checkRes.json();

      if (cancelled) return;
      if (!checkRes.ok || !checkData.valid) {
        setStatus("error");
        setErrorMessage(checkData.error ?? "Link expired or invalid.");
        return;
      }

      setStatus("completing");
      const completeRes = await fetch(`/api/events/${slug}/confirm-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenVal }),
      });
      const completeData = await completeRes.json();

      if (cancelled) return;
      if (!completeRes.ok) {
        setStatus("error");
        setErrorMessage(completeData.error ?? "Could not complete signup.");
        return;
      }

      setSuccessData({
        booking_id: completeData.booking_id,
        event_title: completeData.event_title ?? "Event",
        slug: completeData.slug ?? slug,
        slot_start: completeData.slot_start ?? null,
        slot_end: completeData.slot_end ?? null,
      });
      setStatus("success");
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, token]);

  if (status === "loading" || status === "validating" || status === "completing") {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
        <div className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--shadow)] p-8 max-w-md w-full text-center">
          <p className="text-[var(--foreground)] font-medium">
            {status === "validating"
              ? "Checking your link…"
              : status === "completing"
                ? "Completing your signup…"
                : "Loading…"}
          </p>
          <p className="text-sm text-[var(--muted)] mt-2">
            Please wait.
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
        <div className="rounded-[var(--radius-lg)] border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-8 max-w-md w-full text-center">
          <p className="font-medium text-red-700 dark:text-red-300">Couldn’t complete signup</p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-2">{errorMessage}</p>
          {slug && (
            <Link
              href={`/e/${slug}`}
              className="mt-6 inline-block rounded-lg bg-[var(--accent)] text-white px-4 py-2 text-sm font-medium"
            >
              Back to event
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4 py-8">
      <div className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--shadow)] p-8 max-w-md w-full text-center">
        <p className="text-lg font-semibold text-[var(--foreground)]">You’re signed up!</p>
        <p className="text-sm text-[var(--muted)] mt-2">
          Your email is confirmed and your slot is booked. We’ve sent a confirmation to your inbox.
        </p>

        {successData && (
          <>
            <div className="mt-6 flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-[var(--foreground)]">Add to calendar</p>
              <AddToCalendarLinks
                bookingId={successData.booking_id}
                eventTitle={successData.event_title}
                eventSlug={successData.slug}
                slotStart={successData.slot_start ?? undefined}
                slotEnd={successData.slot_end ?? undefined}
              />
            </div>
            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="text-sm font-medium text-[var(--foreground)]">Share</p>
              <button
                type="button"
                onClick={() => {
                  const url =
                    typeof window !== "undefined"
                      ? `${window.location.origin}/e/${successData.slug}`
                      : "";
                  const text = `I booked a slot for ${successData.event_title}. Book yours: ${url}`;
                  navigator.clipboard.writeText(text);
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2000);
                }}
                className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card)] transition-colors"
              >
                {shareCopied ? "Copied!" : "Copy share message"}
              </button>
            </div>
          </>
        )}

        {(successData?.slug ?? slug) && (
          <Link
            href={`/e/${successData?.slug ?? slug}`}
            className="mt-6 inline-block rounded-lg bg-[var(--accent)] text-white px-5 py-2.5 text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            View schedule & manage booking
          </Link>
        )}
      </div>
    </div>
  );
}
