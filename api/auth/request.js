// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/request
//
// Accepts { email }. Sends a magic-link to any valid email address.
// Always returns { ok: true } regardless — this prevents callers
// from learning whether an email was sent or not.
// ─────────────────────────────────────────────────────────────────────────────

import { createToken, isValidEmail } from "./_utils.js";

const MAGIC_LINK_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const { email } = req.body;

  // Validate format
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  const normalised = email.trim().toLowerCase();

  // Send magic link to any valid email — no allow-list check
  const token = createToken(
    { email: normalised, type: "magic" },
    MAGIC_LINK_EXPIRY_MS
  );

  // Build the magic link URL from the incoming request host
  const proto     = req.headers["x-forwarded-proto"] || "http";
  const host      = req.headers["host"] || "localhost:3000";
  const magicLink = `${proto}://${host}/api/auth/verify?token=${encodeURIComponent(token)}`;

  await sendMagicLinkEmail(normalised, magicLink);

  // Always return ok
  return res.status(200).json({ ok: true });
}

// ── Send email via Resend ─────────────────────────────────────────────────────

async function sendMagicLinkEmail(email, magicLink) {
  const resendKey = process.env.RESEND_API_KEY || "";
  if (!resendKey || !resendKey.startsWith("re_")) {
    console.log(`\n  ┌─ Magic link (dev mode — no RESEND_API_KEY set) ──────────`);
    console.log(`  │  To: ${email}`);
    console.log(`  │  Link: ${magicLink}`);
    console.log(`  └──────────────────────────────────────────────────────────\n`);
    return;
  }

  const from    = process.env.RESEND_FROM_EMAIL || "noreply@aiforauthorscircle.com";
  const subject = "Your sign-in link for Story Scout";
  const html    = buildEmailHtml(magicLink);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to:      [email],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("Resend error:", response.status, body);
    console.log(`\n  ┌─ Magic link (Resend failed — use this to test) ──────────`);
    console.log(`  │  To: ${email}`);
    console.log(`  │  Link: ${magicLink}`);
    console.log(`  └──────────────────────────────────────────────────────────\n`);
  }
}

// ── Email HTML template ───────────────────────────────────────────────────────

function buildEmailHtml(magicLink) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sign in to Story Scout</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="max-width:480px;background:#ffffff;border-radius:10px;
                      border-top:4px solid #4CAF50;padding:40px;
                      box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr>
            <td>
              <p style="margin:0 0 4px;font-family:'Georgia',serif;
                        font-size:1.3rem;font-weight:500;color:#1a1a1a;">
                Story Scout
              </p>
              <p style="margin:0 0 32px;font-family:'Inter',sans-serif;
                        font-size:0.8rem;letter-spacing:0.1em;text-transform:uppercase;
                        color:#4CAF50;font-weight:600;">
                AI for Authors Circle
              </p>
              <p style="margin:0 0 8px;font-family:'Inter',sans-serif;
                        font-size:0.9375rem;color:#1a1a1a;line-height:1.6;">
                Click the button below to sign in. This link expires in
                <strong>15 minutes</strong> and can only be used once.
              </p>
              <p style="margin:0 0 28px;font-family:'Inter',sans-serif;
                        font-size:0.875rem;color:#666;">
                If you did not request this, you can safely ignore it.
              </p>
              <a href="${magicLink}"
                 style="display:inline-block;background:#4CAF50;color:#ffffff;
                        text-decoration:none;padding:14px 32px;border-radius:8px;
                        font-family:'Inter',sans-serif;font-size:0.9375rem;
                        font-weight:600;letter-spacing:0.01em;">
                Sign in to Story Scout
              </a>
              <p style="margin:32px 0 0;font-family:'Inter',sans-serif;
                        font-size:0.8rem;color:#999;line-height:1.5;">
                Or copy and paste this link into your browser:<br />
                <span style="color:#4CAF50;word-break:break-all;">${magicLink}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
