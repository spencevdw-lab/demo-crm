import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/contacts/export
 *
 * Returns all contacts as clean JSON for automation/email tools.
 *
 * Query params (all optional):
 *   sector   – filter to one sector, e.g. ?sector=Education
 *   status   – filter by status, e.g. ?status=LEAD
 *   limit    – max contacts to return (default: all)
 *   offset   – skip N contacts (use with limit for Mon/Tue batch splits)
 *
 * Examples:
 *   /api/contacts/export                          → all contacts
 *   /api/contacts/export?sector=Education         → Education only
 *   /api/contacts/export?limit=300                → first 300
 *   /api/contacts/export?limit=300&offset=300     → next 300 (Tue batch)
 *   /api/contacts/export?sector=Education&limit=300&offset=0
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sectorFilter = searchParams.get("sector");
  const statusFilter = searchParams.get("status");
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
  const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;

  const where: any = {};
  if (sectorFilter) where.sector = { equals: sectorFilter, mode: "insensitive" };
  if (statusFilter) where.status = statusFilter.toUpperCase();

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: [{ sector: "asc" }, { lastName: "asc" }],
      skip: offset,
      take: limit,
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
    }),
    prisma.contact.count({ where }),
  ]);

  // Flatten company object for simplicity
  const rows = contacts.map((c) => ({
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

  return NextResponse.json({
    total,
    returned: rows.length,
    offset,
    limit: limit ?? total,
    contacts: rows,
  });
}
