import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/contacts/by-sector
 *
 * Ultra-simple format: sector name → array of email addresses.
 * Also includes _counts for a quick breakdown.
 *
 * Example response:
 * {
 *   "_counts": { "Education": 420, "Charity": 12, ... },
 *   "Education": ["a@school.com", "b@school.com", ...],
 *   "Charity": ["c@charity.com", ...],
 *   "Unclassified": [...]
 * }
 */
export async function GET() {
  const contacts = await prisma.contact.findMany({
    orderBy: [{ sector: "asc" }, { lastName: "asc" }],
    select: { email: true, sector: true },
  });

  const map: Record<string, string[]> = {};
  for (const c of contacts) {
    const sector = c.sector?.trim() || "Unclassified";
    if (!map[sector]) map[sector] = [];
    map[sector].push(c.email);
  }

  const counts: Record<string, number> = {};
  for (const [sector, emails] of Object.entries(map)) {
    counts[sector] = emails.length;
  }

  return NextResponse.json({ _counts: counts, ...map });
}
