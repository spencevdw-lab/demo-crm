import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx prisma/import-clients.ts <path-to-csv>");
    process.exit(1);
  }

  const csv = fs.readFileSync(path.resolve(filePath), "utf-8");
  const lines = csv.trim().split("\n");
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase().replace(/\s+/g, "").replace(/"/g, ""));

  const firstNameIdx = headers.findIndex((h) => h.includes("firstname") || h === "first");
  const lastNameIdx = headers.findIndex((h) => h.includes("lastname") || h === "last");
  const emailIdx = headers.findIndex((h) => h.includes("email"));
  const titleIdx = headers.findIndex((h) => h.includes("jobtitle") || h.includes("title"));
  const orgIdx = headers.findIndex((h) => h.includes("organisation") || h.includes("organization") || h.includes("company"));

  if (firstNameIdx === -1 || lastNameIdx === -1 || emailIdx === -1) {
    console.error("Could not find required columns: First Name, Last Name, Email");
    process.exit(1);
  }

  const rows = lines.slice(1).map((l) => l.split(delimiter).map((v) => v.trim().replace(/"/g, "")));

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const email = row[emailIdx];
    if (!email || !email.includes("@")) { skipped++; continue; }

    const firstName = row[firstNameIdx] || "";
    const lastName = row[lastNameIdx] || "";
    const title = titleIdx !== -1 ? row[titleIdx] || null : null;
    const orgName = orgIdx !== -1 ? row[orgIdx] || null : null;

    let companyId: string | null = null;
    if (orgName) {
      const existing = await prisma.company.findFirst({ where: { name: orgName } });
      if (existing) {
        companyId = existing.id;
      } else {
        const created = await prisma.company.create({ data: { name: orgName, industry: "Consulting" } });
        companyId = created.id;
      }
    }

    try {
      await prisma.contact.upsert({
        where: { email },
        update: { firstName, lastName, title, companyId },
        create: { firstName, lastName, email, title, status: "CUSTOMER", companyId },
      });
      imported++;
    } catch {
      skipped++;
    }
  }

  console.log(`Import complete: ${imported} imported, ${skipped} skipped`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
