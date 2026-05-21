import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.deal.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  console.log("All demo data cleared.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
