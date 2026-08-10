import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

const isRemoteDb =
  process.env.NODE_ENV === "production" ||
  connectionString.includes("supabase.co") ||
  connectionString.includes("render.com") ||
  connectionString.includes("railway.app") ||
  connectionString.includes("sslmode=");

const pool = new Pool({
  connectionString,
  ...(isRemoteDb ? { ssl: { rejectUnauthorized: false } } : {}),
});

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}