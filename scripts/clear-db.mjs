import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearDb() {
  console.log("Очистка базы...");

  await prisma.proposal.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.review.deleteMany();
  await prisma.tripRequest.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();

  console.log("Готово: пользователи, поездки, брони и предложения удалены.");
}

clearDb()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
