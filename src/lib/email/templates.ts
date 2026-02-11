/**
 * Email templates for confirmations, reminders, and swap requests.
 * Hook these up to SendGrid, Postmark, or Supabase Edge Functions.
 */

export function signupConfirmation(params: {
  participantName: string;
  eventTitle: string;
  slotStart: string;
  slotEnd: string;
  eventUrl: string;
  cancelUrl?: string;
}) {
  return {
    subject: `You're signed up: ${params.eventTitle}`,
    html: `
      <p>Hi${params.participantName ? ` ${params.participantName}` : ""},</p>
      <p>You're confirmed for <strong>${params.eventTitle}</strong>.</p>
      <p><strong>Your slot:</strong> ${params.slotStart} – ${params.slotEnd}</p>
      <p><a href="${params.eventUrl}">View schedule</a>${params.cancelUrl ? ` · <a href="${params.cancelUrl}">Cancel or reschedule</a>` : ""}</p>
    `,
  };
}

export function reminder(params: {
  participantName: string;
  eventTitle: string;
  slotStart: string;
  slotEnd: string;
  eventUrl: string;
}) {
  return {
    subject: `Reminder: ${params.eventTitle} – ${params.slotStart}`,
    html: `
      <p>Hi${params.participantName ? ` ${params.participantName}` : ""},</p>
      <p>This is a reminder for <strong>${params.eventTitle}</strong>.</p>
      <p><strong>Your slot:</strong> ${params.slotStart} – ${params.slotEnd}</p>
      <p><a href="${params.eventUrl}">View schedule</a></p>
    `,
  };
}

export function swapRequest(params: {
  targetName: string;
  requesterName: string;
  requesterSlot: string;
  targetSlot: string;
  eventTitle: string;
  acceptUrl: string;
  declineUrl: string;
}) {
  return {
    subject: `Swap request: ${params.eventTitle}`,
    html: `
      <p>Hi ${params.targetName},</p>
      <p><strong>${params.requesterName}</strong> would like to swap slots with you for <strong>${params.eventTitle}</strong>.</p>
      <p>Their slot: ${params.requesterSlot}<br>Your slot: ${params.targetSlot}</p>
      <p><a href="${params.acceptUrl}">Accept swap</a> · <a href="${params.declineUrl}">Decline</a></p>
    `,
  };
}

export function waitlistPromoted(params: {
  participantName: string;
  eventTitle: string;
  slotStart: string;
  slotEnd: string;
  eventUrl: string;
}) {
  return {
    subject: `You're in: ${params.eventTitle} – slot opened up`,
    html: `
      <p>Hi${params.participantName ? ` ${params.participantName}` : ""},</p>
      <p>A slot opened up for <strong>${params.eventTitle}</strong> and you've been moved from the waitlist.</p>
      <p><strong>Your slot:</strong> ${params.slotStart} – ${params.slotEnd}</p>
      <p><a href="${params.eventUrl}">View schedule</a></p>
    `,
  };
}
