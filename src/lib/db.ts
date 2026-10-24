import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

let readyPromise: Promise<void> | null = null;

export function ready() {
  if (!readyPromise) {
    readyPromise = (async () => {
      if (process.env.DATABASE_URL?.startsWith("file:")) {
        await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
        await prisma.$queryRawUnsafe("PRAGMA busy_timeout=5000;");
        await prisma.$queryRawUnsafe("PRAGMA foreign_keys=ON;");
      }
    })();
  }
  return readyPromise;
}
