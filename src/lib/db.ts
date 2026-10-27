import { PrismaClient } from "@prisma/client";
const globalDB = globalThis as unknown as { db?: PrismaClient };
export const db = globalDB.db ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalDB.db = db;
export const configured = () => Boolean(process.env.DATABASE_URL);
