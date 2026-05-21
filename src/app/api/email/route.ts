import { NextRequest, NextResponse } from "next/server";

function buildHtml(content: string, subject: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%">
        <tr><td style="background:#1e293b;padding:24px 32px">
          <span style="color:#ffffff;font-size:20px;font-weight:700">Brown Consult</span>
        </td></tr>
        <tr><td style="padding:32px;color:#1e293b;font-size:15px;line-height:1.7">
          ${content}
        </td></tr>
        <tr><td style="padding:16px 32px 32px;color:#94a3b8;font-size:12px;border-top:1px solid #f1f5f9">
          &copy; ${new Date().getFullYear()} Brown Consult Ltd &bull; You are receiving this because you are a client or contact.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const { to, toName, subject, body, isHtml } = await req.json();

  if (!to || !subject || !body) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const htmlContent = isHtml ? buildHtml(body, subject) : buildHtml(
    `<p>${body.replace(/\n/g, "<br/>")}</p>`,
    subject
  );

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY!,
    },
    body: JSON.stringify({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME,
      },
      to: [{ email: to, name: toName ?? to }],
      subject,
      htmlContent,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: err?.message ?? "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
