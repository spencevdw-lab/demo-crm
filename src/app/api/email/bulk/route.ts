import { NextRequest, NextResponse } from "next/server";

const LOGO_URL = "https://static.wixstatic.com/media/1e4c48_9f98daab7a0e457588e356717ba7c66b~mv2.png/v1/crop/x_235,y_235,w_959,h_924/fill/w_110,h_106,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/1e4c48_9f98daab7a0e457588e356717ba7c66b~mv2.png";

function buildHtml(body: string, firstName: string) {
  const content = body.replace(/\{\{firstName\}\}/g, firstName).replace(/\n/g, "<br/>");
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%">
        <tr><td style="padding:24px 32px;text-align:center;border-bottom:1px solid #f1f5f9">
          <img src="${LOGO_URL}" alt="Brown Consult" style="height:80px;width:auto" />
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
  const { contacts, subject, body } = await req.json();

  if (!contacts?.length || !subject || !body) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  let sent = 0;
  let failed = 0;

  for (const contact of contacts) {
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
        to: [{ email: contact.email, name: `${contact.firstName} ${contact.lastName}` }],
        subject,
        htmlContent: buildHtml(body, contact.firstName),
      }),
    });

    if (res.ok) {
      sent++;
    } else {
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, failed });
}
