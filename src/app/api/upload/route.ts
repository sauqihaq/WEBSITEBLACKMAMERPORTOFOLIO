import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { head } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { failure, HttpError, json, sameOrigin, audit } from "@/lib/security";
import { putUrl, checkObject } from "@/lib/storage";
const extensions =
  /\.(png|jpg|jpeg|webp|avif|mp4|webm|glb|zip|rar|7z|blend|fbx|obj|stl|exr|pdf)$/i;
export async function POST(req: Request) {
  try {
    const body = await json(req);
    if (body.type) {
      const result = await handleUpload({
        body: body as HandleUploadBody,
        request: req,
        token: process.env.BLOB_READ_WRITE_TOKEN,
        onBeforeGenerateToken: async (pathname) => {
          sameOrigin(req);
          await requireAdmin();
          if (
            !/^[a-zA-Z0-9_./-]+$/.test(pathname) ||
            pathname.includes("..") ||
            !/\.(png|jpg|jpeg|webp|avif|mp4|webm|glb)$/i.test(pathname)
          )
            throw new HttpError(400, "Format media publik tidak didukung.");
          return {
            allowedContentTypes: ({png:['image/png'],jpg:['image/jpeg'],jpeg:['image/jpeg'],webp:['image/webp'],avif:['image/avif'],mp4:['video/mp4'],webm:['video/webm'],glb:['model/gltf-binary','application/octet-stream']} as Record<string,string[]>)[pathname.split('.').pop()!.toLowerCase()],
            maximumSizeInBytes: 150 * 1024 * 1024,
            addRandomSuffix: true,
          };
        },
        onUploadCompleted: async ({ blob }) => {
          const meta = await head(blob.url, {
            token: process.env.BLOB_READ_WRITE_TOKEN,
          });
          await db.media.upsert({
            where: { key: blob.pathname },
            create: {
              key: blob.pathname,
              url: blob.url,
              name: blob.pathname.split("/").pop() || "Media",
              provider: "blob",
              private: false,
              contentType: blob.contentType,
              size: meta.size,
            },
            update: {},
          });
        },
      });
      return Response.json(result);
    }
    sameOrigin(req);
    const admin = await requireAdmin();
    const data = z
      .object({
        action: z.enum(["private-url", "private-complete"]),
        name: z.string().min(1).max(200),
        contentType: z.string().max(100),
        size: z.number().int().positive().max(2_000_000_000),
        key: z.string().optional(),
      })
      .parse(body);
    if (!extensions.test(data.name))
      throw new HttpError(400, "Format tidak didukung.");
    if (data.action === "private-url") {
      const key =
        "paid/" +
        admin.id +
        "/" +
        randomUUID() +
        "/" +
        data.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      return Response.json({ key, url: await putUrl(key, data.contentType) });
    }
    if (
      !data.key?.startsWith("paid/" + admin.id + "/") ||
      data.key.includes("..")
    )
      throw new HttpError(403, "Upload tidak valid.");
    const meta = await checkObject(data.key);
    if (
      meta.ContentLength !== data.size ||
      meta.ContentType !== data.contentType
    )
      throw new HttpError(400, "Metadata file tidak cocok.");
    const media = await db.media.create({
      data: {
        key: data.key,
        name: data.name,
        contentType: data.contentType,
        size: data.size,
        private: true,
        provider: "s3",
      },
    });
    await audit(admin.id, "UPLOAD_PRIVATE", media.id);
    return Response.json({ media });
  } catch (e) {
    return failure(e);
  }
}
