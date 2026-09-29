import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

// Reuse one client across hot reloads in dev, and across requests on a warm serverless instance.
const cache = globalThis as unknown as { prisma?: PrismaClient };

/** The Prisma client, created on first use so builds don't need a database. Server-side only. */
export function db() {
  if (!cache.prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    cache.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }
  return cache.prisma;
}
