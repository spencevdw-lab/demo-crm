import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ImportRow = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title?: string;
  sector?: string;
  location?: string;
  companyName?: string;
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows: ImportRow[] = body.contacts ?? [];

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No contacts provided" }, { status: 400 });
  }

  // Load all existing emails and companies in one go — no overwriting
  const [existingContacts, existingCompanies] = await Promise.all([
    prisma.contact.findMany({ select: { email: true } }),
    prisma.company.findMany({ select: { id: true, name: true } }),
  ]);

  const existingEmails = new Set(existingContacts.map((c) => c.email.toLowerCase()));
  const companyMap = new Map(
    existingCompanies.map((c) => [c.name.toLowerCase(), c.id])
  );

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const email = (row.email ?? "").trim().toLowerCase();

    // Skip if missing required fields or email already exists
    if (!email || !row.firstName?.trim() || !row.lastName?.trim()) {
      skipped++;
      continue;
    }
    if (existingEmails.has(email)) {
      skipped++;
      continue;
    }

    // Resolve or create the company
    let companyId: string | null = null;
    const coName = row.companyName?.trim();
    if (coName) {
      const key = coName.toLowerCase();
      if (companyMap.has(key)) {
        companyId = companyMap.get(key)!;
      } else {
        const newCo = await prisma.company.create({
          data: { name: coName, industry: row.sector?.trim() || "" },
        });
        companyId = newCo.id;
        companyMap.set(key, newCo.id);
      }
    }

    try {
      await prisma.contact.create({
        data: {
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          email: row.email.trim(),
          phone: row.phone?.trim() || null,
          title: row.title?.trim() || null,
          sector: row.sector?.trim() || null,
          location: row.location?.trim() || null,
          status: "CUSTOMER",
          companyId,
        },
      });

      // Sync sector to the company
      if (companyId && row.sector?.trim()) {
        await prisma.company.update({
          where: { id: companyId },
          data: { industry: row.sector.trim() },
        });
      }

      existingEmails.add(email);
      imported++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ imported, skipped });
}
