import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { prepareScriptEnvironment } from "../scripts/lib/script-env";

// Production use requires: FIDELIS_PRODUCTION_OPERATOR=seed-admin ... --production
prepareScriptEnvironment("seed-admin", { allowProductionOperator: true });

const prisma = new PrismaClient();

const MIN_PASSWORD_LENGTH = 16;

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set; there is no default admin.");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
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
