import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { failure, HttpError, json, sameOrigin, audit } from "@/lib/security";
import {
  projectSchema,
  productSchema,
  contentSchema,
  siteSchema,
} from "@/lib/admin";
import { verifyOrder } from "@/lib/commerce";
import { flushMail } from "@/lib/mail";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ module: string }> },
) {
  try {
    await requireAdmin();
    const { module } = await params;
    if (module !== "media") throw new HttpError(404, "Tidak ditemukan.");
    const media = await db.media.findMany({
      select: {
        id: true,
        name: true,
        url: true,
        private: true,
        contentType: true,
        size: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return Response.json({ media });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(
  req: Request,
  { params }: { params: Promise<{ module: string }> },
) {
  try {
    sameOrigin(req);
    const admin = await requireAdmin();
    const { module } = await params;
    const input = await json(req);
    const id = z.string().optional().parse(input.id);
    const remove = input.action === "delete";
    let result: unknown;
    if (module === "portfolio") {
      if (remove) {
        if (!id) throw new HttpError(400, "ID diperlukan");
        result = await db.project.delete({ where: { id } });
      } else {
        const data = projectSchema.parse(input.data);
        const payload = {
          ...data,
          media: data.media as Prisma.InputJsonValue,
          details: data.details as Prisma.InputJsonValue,
        };
        result = id
          ? await db.project.update({ where: { id }, data: payload })
          : await db.project.create({ data: payload });
      }
    } else if (module === "products") {
      if (remove) {
        if (!id) throw new HttpError(400, "ID diperlukan");
        result = await db.product.update({
          where: { id },
          data: { status: "ARCHIVED" },
        });
      } else {
        const { prices, fileIds, ...data } = productSchema.parse(input.data);
        const payload = {
          ...data,
          media: data.media as Prisma.InputJsonValue,
          specifications: data.specifications as Prisma.InputJsonValue,
        };
        result = await db.$transaction(async (tx) => {
          const files = await tx.media.findMany({
            where: { id: { in: fileIds }, private: true },
          });
          if (files.length !== new Set(fileIds).size)
            throw new HttpError(400, "File privat tidak valid.");
          if (data.status === "PUBLISHED" && !files.length)
            throw new HttpError(
              400,
              "Tambahkan file privat sebelum menerbitkan produk.",
            );
          const p = id
            ? await tx.product.update({ where: { id }, data: payload })
            : await tx.product.create({ data: payload });
          await tx.productPrice.deleteMany({ where: { productId: p.id } });
          await tx.productPrice.createMany({
            data: prices.map((price) => ({ ...price, productId: p.id })),
          });
          await tx.productFile.deleteMany({
            where: { productId: p.id, mediaId: { notIn: fileIds } },
          });
          for (const mediaId of fileIds)
            await tx.productFile.upsert({
              where: { productId_mediaId: { productId: p.id, mediaId } },
              create: { productId: p.id, mediaId },
              update: {},
            });
          return p;
        });
      }
    } else if (["services", "blog", "pages", "testimonials"].includes(module)) {
      if (remove) {
        if (!id) throw new HttpError(400, "ID diperlukan");
        result = await db.content.delete({ where: { id } });
      } else {
        const data = contentSchema.parse(input.data);
        const payload = {
          ...data,
          kind: module,
          details: data.details as Prisma.InputJsonValue,
        };
        result = id
          ? await db.content.update({ where: { id }, data: payload })
          : await db.content.create({ data: payload });
      }
    } else if (["settings", "homepage", "navigation"].includes(module)) {
      const data = siteSchema.parse(input.data);
      result = await db.setting.upsert({
        where: { key: "site" },
        create: { key: "site", value: data },
        update: { value: data },
      });
    } else if (module === "categories") {
      if (remove) {
        if (!id) throw new HttpError(400, "ID diperlukan");
        result = await db.category.delete({ where: { id } });
      } else {
        const data = z
          .object({
            name: z.string().min(2),
            slug: z.string().regex(/^[a-z0-9-]+$/),
            kind: z.enum(["portfolio", "products", "blog"]),
          })
          .parse(input.data);
        result = id
          ? await db.category.update({ where: { id }, data })
          : await db.category.create({ data });
      }
    } else if (module === "coupons") {
      if (remove) {
        if (!id) throw new HttpError(400, "ID diperlukan");
        result = await db.coupon.update({
          where: { id },
          data: { active: false },
        });
      } else {
        const data = z
          .object({
            code: z
              .string()
              .min(2)
              .max(40)
              .transform((s) => s.toUpperCase()),
            type: z.enum(["PERCENT", "FIXED"]),
            value: z.number().int().min(0),
            minimum: z.number().int().min(0),
            maxUses: z.number().int().positive().nullable(),
            expiresAt: z
              .string()
              .nullable()
              .transform((v) => (v ? new Date(v) : null)),
            active: z.boolean(),
            productIds: z.array(z.string()).default([]),
          })
          .refine((d) => d.type !== "PERCENT" || d.value <= 100)
          .parse(input.data);
        result = id
          ? await db.coupon.update({ where: { id }, data })
          : await db.coupon.create({ data });
      }
    } else if (["messages", "commissions"].includes(module)) {
      if (!id) throw new HttpError(400, "ID diperlukan");
      result = await db.inquiry.update({
        where: { id },
        data: z
          .object({
            status: z.enum(["NEW", "READ", "IN_PROGRESS", "ARCHIVED"]),
            notes: z.string().max(10000),
          })
          .parse(input.data),
      });
    } else if (module === "reviews") {
      if (!id) throw new HttpError(400, "ID diperlukan");
      result = await db.review.update({
        where: { id },
        data: { approved: z.boolean().parse(input.data.approved) },
      });
    } else if (module === "orders") {
      if (!id) throw new HttpError(400, "ID diperlukan");
      result = { status: await verifyOrder(id) };
    } else if (module === "email") {
      await flushMail();
      result = { ok: true };
    } else if (module === "media") {
      if (!id) throw new HttpError(400, "ID diperlukan");
      if (remove) {
        const m = await db.media.findUnique({
          where: { id },
          include: { files: true },
        });
        if (!m || m.files.length)
          throw new HttpError(409, "File masih digunakan oleh produk.");
        throw new HttpError(
          409,
          "Penghapusan fisik media dilakukan melalui dashboard storage setelah memastikan tidak digunakan oleh halaman.",
        );
      }
      result = await db.media.update({
        where: { id },
        data: z
          .object({
            name: z.string().min(1),
            folder: z.string(),
            tags: z.array(z.string()),
          })
          .parse(input.data),
      });
    } else throw new HttpError(404, "Modul tidak ditemukan.");
    await audit(admin.id, (remove ? "DELETE_" : "SAVE_") + module, id || "new");
    return Response.json({ ok: true, result });
  } catch (e) {
    return failure(e);
  }
}
