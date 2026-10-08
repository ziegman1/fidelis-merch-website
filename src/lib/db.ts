import { PrismaClient } from "@prisma/client";
import { assertDatabaseAllowed } from "@/lib/env-safety";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

let client: PrismaClient | undefined;

function createPrismaClient(): PrismaClient {
  assertDatabaseAllowed();
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

function getPrismaClient(): PrismaClient {
  client ??= globalForPrisma.prisma ?? createPrismaClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}

/**
 * Created on first use, not on import, so builds and module evaluation never
 * require DATABASE_URL. The database safety check runs before the client exists.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const target = getPrismaClient();
    const value = Reflect.get(target, property, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
});
