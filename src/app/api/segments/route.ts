import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Returns all contacts grouped by sector — for use by automation tools.
// Example: GET https://demo-crm-production-f7e0.up.railway.app/api/segments
export async function GET() {
  const contacts = await prisma.contact.findMany({
    orderBy: [{ sector: "asc" }, { lastName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      title: true,
      sector: true,
      location: true,
      status: true,
      company: { select: { name: true, industry: true } },
    },
  });

  // Group by sector
  const segmentMap = new Map<string, typeof contacts>();
  for (const contact of contacts) {
    const sector = contact.sector?.trim() || "Unclassified";
    if (!segmentMap.has(sector)) segmentMap.set(sector, []);
    segmentMap.get(sector)!.push(contact);
  }

  const segments = Array.from(segmentMap.entries()).map(([sector, members]) => ({
    sector,
    count: members.length,
    contacts: members,
  }));

  return NextResponse.json({
    totalContacts: contacts.length,
    segments,
  });
}
