import { db, configured } from "./db";
import { defaultSettings, demoProjects, demoProducts } from "./demo";
export async function settings() {
  if (!configured()) return defaultSettings;
  const s = await db.setting.findUnique({ where: { key: "site" } });
  return { ...defaultSettings, ...((s?.value as object) || {}) };
}
export async function projects() {
  if (!configured()) return demoProjects;
  return db.project.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}
export async function products() {
  if (!configured()) return demoProducts;
  return db.product.findMany({
    where: { status: "PUBLISHED" },
    include: {
      prices: true,
      reviews: {
        where: { approved: true },
        select: { rating: true, text: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
export async function contents(kind: string) {
  if (!configured()) return [];
  return db.content.findMany({
    where: { kind, status: "PUBLISHED" },
    orderBy: { sortOrder: "asc" },
  });
}
