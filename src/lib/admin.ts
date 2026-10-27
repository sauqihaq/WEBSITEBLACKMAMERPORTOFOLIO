import { z } from "zod";
export const safeUrl = z
  .string()
  .refine(
    (s) =>
      s === "" ||
      s === "procedural" ||
      (/^\/(?!\/)/.test(s) && !s.includes("\\")) ||
      /^https:\/\//.test(s),
    "URL harus HTTPS atau path lokal",
  );
const base = {
  title: z.string().min(2).max(150),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(50000),
  cover: safeUrl,
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
};
export const projectSchema = z.object({
  ...base,
  category: z.string().min(1),
  tags: z.array(z.string()).max(30).default([]),
  media: z
    .array(
      z.object({
        url: safeUrl,
        type: z.enum(["image", "video"]),
        caption: z.string().optional(),
      }),
    )
    .max(50)
    .default([]),
  modelUrl: safeUrl.nullable().optional(),
  details: z.record(z.string(), z.unknown()).default({}),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});
export const productSchema = z.object({
  ...base,
  category: z.string().min(1),
  sku: z.string().min(1),
  tags: z.array(z.string()).default([]),
  media: z
    .array(
      z.object({
        url: safeUrl,
        type: z.enum(["image", "video"]),
        caption: z.string().optional(),
      }),
    )
    .default([]),
  modelUrl: safeUrl.nullable().optional(),
  specifications: z.record(z.string(), z.unknown()).default({}),
  featured: z.boolean().default(false),
  prices: z
    .array(
      z.object({
        license: z.string().min(1),
        terms: z.string().min(10),
        amount: z.number().int().min(0).max(1000000000),
      }),
    )
    .min(1)
    .max(10),
  fileIds: z.array(z.string()).default([]),
});
export const contentSchema = z.object({
  ...base,
  details: z.record(z.string(), z.unknown()).default({}),
  sortOrder: z.number().int().default(0),
});
export const siteSchema = z.object({
  brand: z.string().min(1).max(80),
  artist: z.string().max(80),
  tagline: z.string().max(150),
  intro: z.string().max(1000),
  email: z.union([z.email(), z.literal("")]),
  whatsapp: z.string().regex(/^\+?[0-9]{7,16}$|^$/),
  location: z.string().max(100),
  accent: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  heroImage: safeUrl,
  heroMode: z.enum(["image", "video", "model", "gradient"]),
  heroVideo: safeUrl,
  heroModel: safeUrl,
  about: z.string().max(5000),
  availability: z.boolean(),
  skills: z.array(z.string()).max(30),
  sections: z.array(
    z.enum(["portfolio", "about", "shop", "services", "contact"]),
  ),
  socials: z
    .array(
      z.object({
        label: z.string().max(40),
        url: z.url().startsWith("https://"),
      }),
    )
    .max(12),
  theme: z.enum(["dark", "light"]),
  radius: z.number().min(0).max(24),
  motion: z.boolean(),
});
