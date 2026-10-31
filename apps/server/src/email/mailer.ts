import { env } from "../config/env.js";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 10_000;

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(env.email.resendApiKey && env.email.from);
}

export async function sendEmail(message: OutgoingEmail): Promise<void> {
  if (!isEmailDeliveryConfigured()) {
    if (!env.isProduction) {
      console.info(`[email] ${message.subject} → ${message.to}\n${message.text}`);
      return;
    }
    console.error("Email delivery is not configured: set RESEND_API_KEY and EMAIL_FROM.");
    return;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${env.email.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.email.from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
    });
    if (!response.ok) {
      console.error(`Email delivery failed (${response.status}): ${await response.text().catch(() => "")}`);
    }
  } catch (error) {
    console.error("Email delivery failed:", error);
  } finally {
    clearTimeout(timer);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function buildPasswordResetEmail(to: string, displayName: string, resetUrl: string, expiresInMinutes: number): OutgoingEmail {
  const safeName = escapeHtml(displayName);
  const safeUrl = escapeHtml(resetUrl);
  return {
    to,
    subject: "Reset your Difflane password",
    text: `Hi ${displayName},\n\nUse this link to choose a new Difflane password. It expires in ${expiresInMinutes} minutes and can be used once:\n\n${resetUrl}\n\nIf you didn't ask for this, you can ignore this email; your password stays the same.`,
    html: `<p>Hi ${safeName},</p><p>Use the button below to choose a new Difflane password. The link expires in ${expiresInMinutes} minutes and can be used once.</p><p><a href="${safeUrl}" style="display:inline-block;padding:10px 18px;background:#4F6EF7;color:#ffffff;border-radius:6px;text-decoration:none">Reset password</a></p><p style="color:#6b7280;font-size:13px">Or paste this link into your browser:<br>${safeUrl}</p><p style="color:#6b7280;font-size:13px">If you didn't ask for this, you can ignore this email; your password stays the same.</p>`,
  };
}
