/**
 * Email templates for confirmations, reminders, and swap requests.
 * Used with Resend when RESEND_API_KEY and EMAIL_FROM are set.
 */

export const wrapHtml = (body: string) =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1e293b;max-width:560px;margin:0 auto;padding:24px">${body}</body></html>`;

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Email sent to participant to confirm their email before we create the booking. */
export function confirmSignupEmail(params: {
  eventTitle: string;
  slotStart: string;
  slotEnd: string;
  confirmUrl: string;
}) {
  const title = escapeHtml(params.eventTitle);
  const slot = escapeHtml(`${params.slotStart} – ${params.slotEnd}`);
  const body = `
    <p>You requested to sign up for a slot.</p>
    <p><strong>${title}</strong><br>${slot}</p>
    <p>Click the link below to <strong>confirm your email</strong> and complete your booking. This link expires in 1 hour.</p>
    <p><a href="${params.confirmUrl}" style="color:#0d9488;font-weight:600">Confirm my signup</a></p>
    <p>If you didn't request this, you can ignore this email.</p>
  `;
  return {
    subject: `Confirm your signup: ${params.eventTitle}`,
    html: wrapHtml(body),
  };
}

export function signupConfirmation(params: {
  participantName?: string;
  eventTitle: string;
  slotStart: string;
  slotEnd: string;
  eventUrl: string;
  cancelUrl?: string;
}) {
  const name = params.participantName ? ` ${escapeHtml(params.participantName)}` : "";
  const title = escapeHtml(params.eventTitle);
  const slot = escapeHtml(`${params.slotStart} – ${params.slotEnd}`);
  const body = `
    <p>Hi${name},</p>
    <p>Your slot booking is confirmed for <strong>${title}</strong>.</p>
    <p><strong>Your slot:</strong> ${slot}</p>
    <p>You can cancel or request a swap anytime using the link below.</p>
    <p><a href="${params.eventUrl}" style="color:#0d9488;font-weight:600">View schedule &amp; manage booking</a></p>
  `;
  return {
    subject: `Booking confirmed: ${params.eventTitle}`,
    html: wrapHtml(body),
  };
}

export function reminder(params: {
  participantName?: string;
  eventTitle: string;
  slotStart: string;
  slotEnd: string;
  eventUrl: string;
  whenLabel?: string;
}) {
  const name = params.participantName ? ` ${escapeHtml(params.participantName)}` : "";
  const title = escapeHtml(params.eventTitle);
  const slot = escapeHtml(`${params.slotStart} – ${params.slotEnd}`);
  const whenText = params.whenLabel ? ` (${params.whenLabel})` : "";
  const body = `
    <p>Hi${name},</p>
    <p>Reminder: your slot for <strong>${title}</strong> is coming up${whenText}.</p>
    <p><strong>Your slot:</strong> ${slot}</p>
    <p><a href="${params.eventUrl}" style="color:#0d9488;font-weight:600">View schedule</a></p>
  `;
  return {
    subject: `Reminder: ${params.eventTitle} – ${params.slotStart}`,
    html: wrapHtml(body),
  };
}

export function swapRequest(params: {
  targetName: string;
  requesterName: string;
  requesterSlot: string;
  targetSlot: string;
  eventTitle: string;
  eventUrl: string;
}) {
  const targetName = escapeHtml(params.targetName);
  const requesterName = escapeHtml(params.requesterName);
  const title = escapeHtml(params.eventTitle);
  const reqSlot = escapeHtml(params.requesterSlot);
  const tgtSlot = escapeHtml(params.targetSlot);
  const body = `
    <p>Hi ${targetName},</p>
    <p><strong>${requesterName}</strong> has requested to swap slots with you for <strong>${title}</strong>.</p>
    <p><strong>Their slot:</strong> ${reqSlot}<br><strong>Your slot:</strong> ${tgtSlot}</p>
    <p>Open the link below to accept (exchange slots) or decline the request.</p>
    <p><a href="${params.eventUrl}" style="color:#0d9488;font-weight:600">Accept or decline swap</a></p>
  `;
  return {
    subject: `Swap request: ${params.eventTitle}`,
    html: wrapHtml(body),
  };
}

export function participantNoSlotQuery(params: {
  eventTitle: string;
  participantName: string;
  participantEmail: string;
  message?: string;
  eventUrl: string;
}) {
  const title = escapeHtml(params.eventTitle);
  const name = escapeHtml(params.participantName || "—");
  const email = escapeHtml(params.participantEmail);
  const msg = params.message ? `<p><strong>Message:</strong><br>${escapeHtml(params.message).replace(/\n/g, "<br>")}</p>` : "";
  const body = `
    <p>A participant was unable to get a slot for <strong>${title}</strong> and has sent a message.</p>
    <p><strong>Name:</strong> ${name}<br><strong>Email:</strong> ${email}</p>
    ${msg}
    <p><a href="${params.eventUrl}" style="color:#0d9488;font-weight:600">View event</a></p>
  `;
  return {
    subject: `Message: No slot available – ${params.eventTitle}`,
    html: wrapHtml(body),
  };
}

export function bookingCancelled(params: {
  participantName?: string;
  eventTitle: string;
  slotStart: string;
  slotEnd: string;
  eventUrl: string;
  reason?: "cancelled_by_you" | "removed_by_organizer" | "slot_removed";
}) {
  const name = params.participantName ? ` ${escapeHtml(params.participantName)}` : "";
  const title = escapeHtml(params.eventTitle);
  const slot = escapeHtml(`${params.slotStart} – ${params.slotEnd}`);
  const reasonText =
    params.reason === "removed_by_organizer"
      ? "The organizer has removed you from this slot."
      : params.reason === "slot_removed"
        ? "This slot was removed by the organizer."
        : "You have cancelled this booking.";
  const body = `
    <p>Hi${name},</p>
    <p>Your booking for <strong>${title}</strong> has been cancelled.</p>
    <p><strong>Slot was:</strong> ${slot}</p>
    <p>${reasonText}</p>
    <p><a href="${params.eventUrl}" style="color:#0d9488;font-weight:600">View schedule</a></p>
  `;
  return {
    subject: `Booking cancelled: ${params.eventTitle}`,
    html: wrapHtml(body),
  };
}

export function waitlistJoined(params: {
  participantName?: string;
  eventTitle: string;
  slotStart: string;
  slotEnd: string;
  eventUrl: string;
}) {
  const name = params.participantName ? ` ${escapeHtml(params.participantName)}` : "";
  const title = escapeHtml(params.eventTitle);
  const slot = escapeHtml(`${params.slotStart} – ${params.slotEnd}`);
  const body = `
    <p>Hi${name},</p>
    <p>You're on the waitlist for <strong>${title}</strong>.</p>
    <p><strong>Slot:</strong> ${slot}</p>
    <p>We'll email you if a spot opens up.</p>
    <p><a href="${params.eventUrl}" style="color:#0d9488;font-weight:600">View schedule</a></p>
  `;
  return {
    subject: `You're on the waitlist: ${params.eventTitle}`,
    html: wrapHtml(body),
  };
}

export function waitlistPromoted(params: {
  participantName?: string;
  eventTitle: string;
  slotStart: string;
  slotEnd: string;
  eventUrl: string;
}) {
  const name = params.participantName ? ` ${escapeHtml(params.participantName)}` : "";
  const title = escapeHtml(params.eventTitle);
  const slot = escapeHtml(`${params.slotStart} – ${params.slotEnd}`);
  const body = `
    <p>Hi${name},</p>
    <p>A slot opened up for <strong>${title}</strong> and you have been moved from the waitlist.</p>
    <p><strong>Your slot:</strong> ${slot}</p>
    <p><a href="${params.eventUrl}" style="color:#0d9488;font-weight:600">View schedule</a></p>
  `;
  return {
    subject: `Slot confirmed: ${params.eventTitle}`,
    html: wrapHtml(body),
  };
}

export function participantCancelledNotifyOrganizer(params: {
  eventTitle: string;
  slotStart: string;
  slotEnd: string;
  participantName?: string;
  participantEmail: string;
  eventUrl: string;
}) {
  const title = escapeHtml(params.eventTitle);
  const slot = escapeHtml(`${params.slotStart} – ${params.slotEnd}`);
  const name = escapeHtml(params.participantName || "—");
  const email = escapeHtml(params.participantEmail);
  const body = `
    <p>A participant has cancelled their booking for <strong>${title}</strong>.</p>
    <p><strong>Slot:</strong> ${slot}</p>
    <p><strong>Participant:</strong> ${name} &lt;${email}&gt;</p>
    <p><a href="${params.eventUrl}" style="color:#0d9488;font-weight:600">View event schedule</a></p>
  `;
  return {
    subject: `Booking cancelled: ${params.eventTitle} – slot freed`,
    html: wrapHtml(body),
  };
}

export function swapAccepted(params: {
  participantName?: string;
  eventTitle: string;
  newSlotStart: string;
  newSlotEnd: string;
  eventUrl: string;
}) {
  const name = params.participantName ? ` ${escapeHtml(params.participantName)}` : "";
  const title = escapeHtml(params.eventTitle);
  const slot = escapeHtml(`${params.newSlotStart} – ${params.newSlotEnd}`);
  const body = `
    <p>Hi${name},</p>
    <p>Your swap for <strong>${title}</strong> has been accepted.</p>
    <p><strong>Your new slot:</strong> ${slot}</p>
    <p><a href="${params.eventUrl}" style="color:#0d9488;font-weight:600">View schedule</a></p>
  `;
  return {
    subject: `Swap confirmed: ${params.eventTitle}`,
    html: wrapHtml(body),
  };
}

export function swapDeclined(params: {
  participantName?: string;
  eventTitle: string;
  yourSlot: string;
  eventUrl: string;
}) {
  const name = params.participantName ? ` ${escapeHtml(params.participantName)}` : "";
  const title = escapeHtml(params.eventTitle);
  const slot = escapeHtml(params.yourSlot);
  const body = `
    <p>Hi${name},</p>
    <p>Your swap request for <strong>${title}</strong> was declined. Your booking is unchanged.</p>
    <p><strong>Your slot:</strong> ${slot}</p>
    <p><a href="${params.eventUrl}" style="color:#0d9488;font-weight:600">View schedule</a></p>
  `;
  return {
    subject: `Swap declined: ${params.eventTitle}`,
    html: wrapHtml(body),
  };
}

/** Replace placeholders in a string. Values are escaped for HTML. */
export function replacePlaceholders(
  text: string,
  replacements: { event_title?: string; event_link?: string; participant_name?: string; participant_email?: string }
): string {
  let out = text;
  if (replacements.event_title !== undefined) out = out.replace(/\{\{event_title\}\}/g, escapeHtml(replacements.event_title));
  if (replacements.event_link !== undefined) out = out.replace(/\{\{event_link\}\}/g, replacements.event_link);
  if (replacements.participant_name !== undefined) out = out.replace(/\{\{participant_name\}\}/g, escapeHtml(replacements.participant_name ?? ""));
  if (replacements.participant_email !== undefined) out = out.replace(/\{\{participant_email\}\}/g, escapeHtml(replacements.participant_email ?? ""));
  return out;
}

/** Build HTML from admin-written body (placeholders already replaced). Newlines -> <br>, escape HTML. */
export function customBodyToHtml(body: string): string {
  return escapeHtml(body).replace(/\n/g, "<br>");
}

/** Invite-to-book email: send to a list so they can use the link to book a slot. */
export function inviteToBookEmail(params: {
  eventTitle: string;
  eventUrl: string;
  customMessage?: string;
}) {
  const title = escapeHtml(params.eventTitle);
  const custom = params.customMessage
    ? `<p>${escapeHtml(params.customMessage).replace(/\n/g, "<br>")}</p>`
    : "";
  const body = `
    <p>You're invited to book a slot for <strong>${title}</strong>.</p>
    <p>Use the link below to pick your time and confirm your signup.</p>
    ${custom}
    <p><a href="${params.eventUrl}" style="color:#0d9488;font-weight:600">Book your slot</a></p>
    <p>If you didn't expect this email, you can ignore it.</p>
  `;
  return {
    subject: `Book your slot: ${params.eventTitle}`,
    html: wrapHtml(body),
  };
}

/** Notify I&E staff that someone requested admin access. */
export function adminAccessRequestNotification(params: { requesterEmail: string; requesterName?: string }) {
  const email = escapeHtml(params.requesterEmail);
  const name = params.requesterName?.trim() ? escapeHtml(params.requesterName) : email;
  const body = `
    <p>Someone requested access to the Innovation &amp; Entrepreneurship admin (event/slot management).</p>
    <p><strong>Email:</strong> ${email}<br><strong>Name:</strong> ${name}</p>
    <p>To grant access, add this email to the <code>allowed_admins</code> table in Supabase (SQL Editor):</p>
    <p><code>INSERT INTO allowed_admins (email) VALUES ('${email}') ON CONFLICT (email) DO NOTHING;</code></p>
    <p>After that, they can sign in at Admin sign in and create/manage events.</p>
  `;
  return {
    subject: `Admin access requested: ${params.requesterEmail}`,
    html: wrapHtml(body),
  };
}
