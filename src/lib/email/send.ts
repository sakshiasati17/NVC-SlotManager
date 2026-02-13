const from = process.env.EMAIL_FROM ?? "Slot Time <onboarding@resend.dev>";

export async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Email] RESEND_API_KEY not set – notifications are disabled. Add it to .env.local to enable emails.");
    } else {
      console.warn("[Email] RESEND_API_KEY not set in production – notification not sent. Add RESEND_API_KEY in Vercel → Settings → Environment Variables.");
    }
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) {
      console.error("[Email] Send failed:", { to: to.slice(0, 30), subject: subject.slice(0, 40), error: error.message });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Email] Send error:", message);
    return { ok: false, error: message };
  }
}
