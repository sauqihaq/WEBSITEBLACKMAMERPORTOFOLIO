import type { MetadataRoute } from "next";
export const dynamic = "force-dynamic";
import { projects, products, contents } from "@/lib/content";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const root = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const [work, assets, blog] = await Promise.all([
    projects(),
    products(),
    contents("blog"),
  ]);
  return [
    "",
    "/portfolio",
    "/shop",
    "/services",
    "/about",
    "/contact",
    "/blog",
    "/faq",
    ...work.map((p) => "/portfolio/" + p.slug),
    ...assets.map((p) => "/shop/" + p.slug),
    ...blog.map((p) => "/blog/" + p.slug),
  ].map((path) => ({ url: root + path, lastModified: new Date() }));
}
