import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.company.updateMany({
    where: { industry: "Consulting" },
    data: { industry: "" },
  });
  console.log(`Cleared "Consulting" from ${result.count} companies.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
