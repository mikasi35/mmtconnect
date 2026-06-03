const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = process.env.RESEND_FROM || 'no-reply@vacancies.mmtcare.com.au';
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_WEB_URL || 'https://vacancies.mmtcare.com.au';

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(options: SendEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const body = {
    from: FROM_EMAIL,
    to: Array.isArray(options.to) ? options.to : [options.to],
    subject: options.subject,
    html: options.html,
    text: options.text || undefined,
  };

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Resend API failed: ${response.status} ${response.statusText} - ${payload}`);
  }

  return response.json();
}

export function getPublicSiteUrl() {
  return PUBLIC_SITE_URL.replace(/\/$/, '');
}

export function extractEmailFromContact(contact?: string) {
  if (!contact) return undefined;
  const match = contact.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return match?.[0];
}

export function buildTrackingUrl(trackingId: string) {
  return `${getPublicSiteUrl()}/find/track?code=${encodeURIComponent(trackingId)}`;
}
