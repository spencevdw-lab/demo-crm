import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const BREVO_API_KEY = process.env.BREVO_API_KEY ?? "";
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL ?? "info@brownconsult.co.uk";
const SENDER_NAME = process.env.BREVO_SENDER_NAME ?? "Brown Consult";

const LOGO_URL =
  "https://static.wixstatic.com/media/1e4c48_9f98daab7a0e457588e356717ba7c66b~mv2.png/v1/crop/x_235,y_235,w_959,h_924/fill/w_220,h_212,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/1e4c48_9f98daab7a0e457588e356717ba7c66b~mv2.png";

type NewsItem = {
  headline: string;
  summary: string;
  readMoreUrl: string;
  source: string;
};

type Spotlight = {
  service: string;
  copy: string;
  ctaText: string;
  ctaUrl: string;
};

export type NewsletterPayload = {
  subject: string;
  intro: string;
  newsItems: NewsItem[];
  spotlight: Spotlight;
  sector?: string; // "Education" | "Police" | "Fire" | "Health" | "all"
  batchOffset?: number;
  batchLimit?: number;
  previewOnly?: boolean; // if true, returns HTML without sending
};

function buildHtml(payload: NewsletterPayload, recipientFirstName = "there"): string {
  const gold = "#8B6B18";
  const dark = "#1a1a1a";
  const textColor = "#444444";
  const bgLight = "#fafaf8";
  const border = "#efefef";
  const font = "Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  const newsItemsHtml = payload.newsItems
    .map(
      (item) => `
    <tr>
      <td style="padding:0 0 24px 0;">
        <p style="margin:0 0 6px 0;font-size:16px;font-weight:bold;color:${dark};font-family:${font};">
          ${item.headline}
        </p>
        <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:${textColor};font-family:${font};">
          ${item.summary}
        </p>
        <a href="${item.readMoreUrl}" style="font-size:13px;color:${gold};text-decoration:none;font-family:${font};">
          Read more → <span style="font-size:11px;color:#888;">(${item.source})</span>
        </a>
      </td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${payload.subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:${font};">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;">
  <tr>
    <td align="center" style="padding:24px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- HEADER -->
        <tr>
          <td style="background-color:#ffffff;padding:28px 32px 0 32px;border-bottom:3px solid ${gold};">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <a href="https://www.brownconsult.co.uk" style="text-decoration:none;">
                    <img src="${LOGO_URL}" alt="Brown Consult" width="110" height="106" style="display:block;border:0;" />
                  </a>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <p style="margin:0;font-size:12px;color:#888;font-family:${font};">Fractional Estates Director &amp; FM Consultancy</p>
                </td>
              </tr>
            </table>
            <div style="height:16px;"></div>
          </td>
        </tr>

        <!-- INTRO -->
        <tr>
          <td style="padding:28px 32px 8px 32px;background-color:#ffffff;">
            <p style="margin:0 0 8px 0;font-size:15px;color:${textColor};line-height:1.6;font-family:${font};">
              Hi ${recipientFirstName},
            </p>
            <p style="margin:0;font-size:15px;color:${textColor};line-height:1.6;font-family:${font};">
              ${payload.intro}
            </p>
          </td>
        </tr>

        <!-- DIVIDER -->
        <tr><td style="padding:16px 32px;"><hr style="border:0;border-top:1px solid ${border};margin:0;" /></td></tr>

        <!-- IN THE SECTOR -->
        <tr>
          <td style="padding:0 32px 8px 32px;background-color:#ffffff;">
            <p style="margin:0 0 16px 0;font-size:11px;font-weight:bold;letter-spacing:2px;color:${gold};text-transform:uppercase;font-family:${font};">In the Sector</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              ${newsItemsHtml}
            </table>
          </td>
        </tr>

        <!-- DIVIDER -->
        <tr><td style="padding:0 32px 16px 32px;"><hr style="border:0;border-top:1px solid ${border};margin:0;" /></td></tr>

        <!-- FROM BROWN CONSULT -->
        <tr>
          <td style="padding:0 32px 28px 32px;background-color:${bgLight};">
            <div style="height:20px;"></div>
            <p style="margin:0 0 12px 0;font-size:11px;font-weight:bold;letter-spacing:2px;color:${gold};text-transform:uppercase;font-family:${font};">From Brown Consult</p>
            <p style="margin:0 0 6px 0;font-size:16px;font-weight:bold;color:${dark};font-family:${font};">${payload.spotlight.service}</p>
            <p style="margin:0 0 20px 0;font-size:14px;line-height:1.7;color:${textColor};font-family:${font};">${payload.spotlight.copy}</p>
            <a href="${payload.spotlight.ctaUrl}"
               style="display:inline-block;background-color:${gold};color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 28px;border-radius:4px;font-family:${font};">
              ${payload.spotlight.ctaText}
            </a>
          </td>
        </tr>

        <!-- SIGNOFF -->
        <tr>
          <td style="padding:24px 32px;background-color:#ffffff;border-top:1px solid ${border};">
            <p style="margin:0;font-size:14px;color:${textColor};line-height:1.6;font-family:${font};">
              Kind regards,<br />
              <strong>Spencer van der Werf</strong><br />
              Managing Director, Brown Consult<br />
              <a href="tel:02045587729" style="color:${gold};text-decoration:none;">020 4558 7729</a> &nbsp;|&nbsp;
              <a href="https://www.brownconsult.co.uk" style="color:${gold};text-decoration:none;">brownconsult.co.uk</a>
            </p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background-color:${dark};padding:20px 32px;border-radius:0 0 8px 8px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <p style="margin:0 0 4px 0;font-size:12px;color:#cccccc;font-family:${font};">
                    <strong style="color:#ffffff;">Brown Consult Ltd</strong> &nbsp;|&nbsp; 71-75 Shelton Street, Covent Garden, London WC2H 9JQ
                  </p>
                  <p style="margin:0 0 8px 0;font-size:12px;color:#cccccc;font-family:${font};">
                    <a href="mailto:info@brownconsult.co.uk" style="color:${gold};text-decoration:none;">info@brownconsult.co.uk</a>
                    &nbsp;|&nbsp;
                    <a href="https://www.linkedin.com/company/brown-consult" style="color:${gold};text-decoration:none;">LinkedIn</a>
                  </p>
                  <p style="margin:0;font-size:11px;color:#777777;font-family:${font};">
                    You are receiving this because you are a contact of Brown Consult. To unsubscribe, reply with "unsubscribe" in the subject line.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const payload: NewsletterPayload = await req.json();

  // Validate required fields
  if (!payload.subject || !payload.intro || !payload.newsItems?.length || !payload.spotlight) {
    return NextResponse.json({ error: "Missing required fields: subject, intro, newsItems, spotlight" }, { status: 400 });
  }

  // Preview mode — just return the HTML
  if (payload.previewOnly) {
    return NextResponse.json({ html: buildHtml(payload) });
  }

  // Fetch contacts from DB
  const where: any = {};
  if (payload.sector && payload.sector !== "all") {
    where.sector = { equals: payload.sector, mode: "insensitive" };
  }

  const allContacts = await prisma.contact.findMany({
    where,
    orderBy: [{ sector: "asc" }, { lastName: "asc" }],
    select: { firstName: true, lastName: true, email: true },
  });

  // Apply batch offset/limit
  const offset = payload.batchOffset ?? 0;
  const limit = payload.batchLimit;
  const contacts = limit !== undefined
    ? allContacts.slice(offset, offset + limit)
    : allContacts.slice(offset);

  if (contacts.length === 0) {
    return NextResponse.json({ error: "No contacts found for the specified sector/batch" }, { status: 400 });
  }

  // Send individually via Brevo (so each email is personalised)
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const contact of contacts) {
    const html = buildHtml(payload, contact.firstName || "there");

    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender: { name: SENDER_NAME, email: SENDER_EMAIL },
          to: [{ email: contact.email, name: `${contact.firstName} ${contact.lastName}` }],
          subject: payload.subject,
          htmlContent: html,
        }),
      });

      if (res.ok) {
        sent++;
      } else {
        const err = await res.json().catch(() => ({}));
        failed++;
        errors.push(`${contact.email}: ${err?.message ?? res.status}`);
      }
    } catch (e: any) {
      failed++;
      errors.push(`${contact.email}: ${e.message}`);
    }
  }

  return NextResponse.json({
    sent,
    failed,
    total: contacts.length,
    sector: payload.sector ?? "all",
    errors: errors.slice(0, 10), // cap error list
  });
}
