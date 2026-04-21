import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.DEMO_USER_EMAIL ?? "owner@example.com";

  await prisma.uptimeLog.deleteMany();
  await prisma.errorLog.deleteMany();
  await prisma.qaRun.deleteMany();
  await prisma.project.deleteMany();

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
