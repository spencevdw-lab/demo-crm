import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/segments
 *
 * Returns contacts grouped by sector — for automation/email segmentation.
 *
 * Query params (all optional):
 *   sector   – return only one sector, e.g. ?sector=Education
 *   status   – filter by status: LEAD, CUSTOMER, QUALIFIED, CHURNED, or "all" (default: all)
 *   limit    – cap contacts per segment (e.g. 300 for Mon batch)
 *   offset   – skip N within each segment (e.g. 300 for Tue batch)
 *
 * Examples:
 *   /api/segments                                 → all sectors, all statuses
 *   /api/segments?status=all                      → same (explicit)
 *   /api/segments?status=CUSTOMER                 → customers only
 *   /api/segments?status=LEAD                     → leads only
 *   /api/segments?sector=Education                → Education segment only
 *   /api/segments?limit=300&offset=0              → first 300 per sector (Mon)
 *   /api/segments?limit=300&offset=300            → next 300 per sector (Tue)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sectorFilter = searchParams.get("sector");
  const statusFilter = searchParams.get("status"); // "all" or a specific status
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
  const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;

  const where: any = {};
  if (sectorFilter) where.sector = { equals: sectorFilter, mode: "insensitive" };
  // "all" or omitted = no filter; anything else is treated as a specific status
  if (statusFilter && statusFilter.toLowerCase() !== "all") {
    where.status = statusFilter.toUpperCase();
  }

  const allContacts = await prisma.contact.findMany({
    where,
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
      company: { select: { name: true } },
    },
  });

  // Flatten company
  const flat = allContacts.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone ?? "",
    title: c.title ?? "",
    sector: c.sector ?? "",
    location: c.location ?? "",
    status: c.status,
    company: c.company?.name ?? "",
  }));

  // Group by sector
  const segmentMap = new Map<string, typeof flat>();
  for (const contact of flat) {
    const sector = contact.sector?.trim() || "Unclassified";
    if (!segmentMap.has(sector)) segmentMap.set(sector, []);
    segmentMap.get(sector)!.push(contact);
  }

  // Apply offset + limit within each segment
  const segments = Array.from(segmentMap.entries()).map(([sector, members]) => {
    const sliced = limit !== undefined ? members.slice(offset, offset + limit) : members.slice(offset);
    return {
      sector,
      totalInSegment: members.length,
      returned: sliced.length,
      contacts: sliced,
    };
  });

  return NextResponse.json({
    totalContacts: flat.length,
    offset,
    limit: limit ?? "all",
    segments,
  });
}
