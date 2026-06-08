import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BREVO_API_KEY = process.env.BREVO_API_KEY ?? "";

/**
 * GET /api/bounces
 *
 * Returns all bounced email addresses from Brevo for the last N days.
 * Ultra-simple format for easy parsing by automation tools.
 *
 * Query params:
 *   days  – how many days back to look (default: 7)
 *
 * Example response:
 * {
 *   "total": 3,
 *   "since": "2026-05-26",
 *   "bounced": [
 *     { "email": "bad@school.com", "type": "hardBounces", "date": "2026-06-02" },
 *     ...
 *   ],
 *   "emails": ["bad@school.com", "another@school.com"]
 * }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "7");

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split("T")[0];

  const allEvents: any[] = [];
  const limit = 100;
  let offset = 0;

  // Fetch all bounce events from Brevo
  for (let page = 0; page < 10; page++) {
    const url = new URL("https://api.brevo.com/v3/smtp/statistics/events");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("startDate", startDateStr);
    url.searchParams.set("event", "hardBounces");

    const res = await fetch(url.toString(), {
      headers: { "api-key": BREVO_API_KEY, accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) break;
    const data = await res.json();
    const events: any[] = data.events ?? [];
    allEvents.push(...events);
    if (events.length < limit) break;
    offset += limit;
  }

  // Also fetch soft bounces
  offset = 0;
  for (let page = 0; page < 10; page++) {
    const url = new URL("https://api.brevo.com/v3/smtp/statistics/events");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("startDate", startDateStr);
    url.searchParams.set("event", "softBounces");

    const res = await fetch(url.toString(), {
      headers: { "api-key": BREVO_API_KEY, accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) break;
    const data = await res.json();
    const events: any[] = data.events ?? [];
    allEvents.push(...events);
    if (events.length < limit) break;
    offset += limit;
  }

  // Deduplicate by email
  const seen = new Map<string, { email: string; type: string; date: string }>();
  for (const ev of allEvents) {
    const email = (ev.email ?? "").toLowerCase();
    if (email && !seen.has(email)) {
      seen.set(email, {
        email,
        type: ev.event ?? "bounce",
        date: (ev.date ?? "").split("T")[0],
      });
    }
  }

  const bounced = Array.from(seen.values()).sort((a, b) => b.date.localeCompare(a.date));
  const emails = bounced.map((b) => b.email);

  return NextResponse.json({
    total: bounced.length,
    since: startDateStr,
    bounced,
    emails, // plain list for easy use
  });
}
