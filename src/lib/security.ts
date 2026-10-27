import { createHash } from "node:crypto";
import { db, configured } from "./db";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function requireDatabase() {
  if (!configured())
    throw new HttpError(
      503,
      "Database belum terhubung. Konfigurasikan PostgreSQL untuk mengaktifkan fitur ini.",
    );
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const localHost = request.headers.get("host");
  const fallback = process.env.NODE_ENV !== "production" && localHost && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(localHost)
    ? "http://" + localHost : request.url;
  const expected = new URL(process.env.NEXTAUTH_URL || fallback).origin;
  if (origin !== expected) throw new HttpError(403, "Origin tidak diizinkan.");
}
export async function limit(key: string, max = 8, seconds = 900) {
  requireDatabase();
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const digest = createHash("sha256")
    .update(key + bucket)
    .digest("hex");
  const row = await db.rateLimit.upsert({
    where: { key: digest },
    create: { key: digest, expiresAt: new Date((bucket + 1) * seconds * 1000) },
    update: { hits: { increment: 1 } },
  });
  if (row.hits > max)
    throw new HttpError(429, "Terlalu banyak permintaan. Coba lagi nanti.");
}
export function ip(request: Request) {
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    "local"
  );
}
export async function json(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 100000)
    throw new HttpError(413, "Data terlalu besar.");
  const text = await request.text();
  if (text.length > 100000) throw new HttpError(413, "Data terlalu besar.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "JSON tidak valid.");
  }
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && error.name === "ZodError")
    return Response.json(
      { error: "Periksa kembali data yang dimasukkan." },
      { status: 400 },
    );
  console.error(
    "Request failed:",
    error instanceof Error ? error.name : "Unknown",
  );
  return Response.json(
    { error: "Permintaan gagal. Periksa koneksi dan coba lagi." },
    { status: 500 },
  );
}
export async function audit(actorId: string, action: string, target: string) {
  await db.auditLog.create({ data: { actorId, action, target } });
}
