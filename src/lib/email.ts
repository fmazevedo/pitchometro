type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** Sends a transactional email through Resend (https://resend.com). */
export async function sendEmail(message: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Envio de e-mail não configurado: defina RESEND_API_KEY e EMAIL_FROM.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend respondeu ${response.status}: ${detail.slice(0, 300)}`);
  }
}

/**
 * Public base URL used in links sent by email. Never derived from the request Host header,
 * so a forged header cannot redirect a reset link to another site.
 */
export function getAppUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}
