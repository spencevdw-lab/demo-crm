import { NextRequest, NextResponse } from "next/server";

const BREVO_TEMPLATE_ID = 4;

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
        templateId: BREVO_TEMPLATE_ID,
        params: {
          firstName: contact.firstName,
          body: body.replace(/\n/g, "<br/>"),
        },
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
