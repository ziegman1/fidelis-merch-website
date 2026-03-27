import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_EMAIL = "admin@fidelis.example";
const DEFAULT_PASSWORD = "admin123";

async function main() {
  const email = process.env.ADMIN_EMAIL ?? DEFAULT_EMAIL;
  const password = process.env.ADMIN_PASSWORD ?? DEFAULT_PASSWORD;
  const adminPassword = await hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Admin",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
    update: {
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("Admin user ready:", user.email, "(role:", user.role, ")");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
