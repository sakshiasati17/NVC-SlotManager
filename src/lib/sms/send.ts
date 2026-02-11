/**
 * Send SMS via Twilio when TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER are set.
 * Phone numbers should be in E.164 format (e.g. +1234567890).
 */

export async function sendSms(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !from) {
    return { ok: true };
  }
  const digits = to.replace(/\D/g, "");
  let toE164: string;
  if (digits.length === 10) toE164 = "+1" + digits;
  else if (digits.length === 11 && digits.startsWith("1")) toE164 = "+" + digits;
  else if (digits.length >= 10) toE164 = "+" + digits;
  else return { ok: false, error: "Invalid phone number" };
  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(accountSid, authToken);
    await client.messages.create({ body, from, to: toE164 });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[SMS] Send error:", message);
    return { ok: false, error: message };
  }
}
