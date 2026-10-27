import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { get } from "@vercel/blob";
import { HttpError } from "./security";
export const s3 = () => {
  if (
    !process.env.S3_ENDPOINT ||
    !process.env.S3_ACCESS_KEY_ID ||
    !process.env.S3_SECRET_ACCESS_KEY ||
    !process.env.S3_BUCKET
  )
    throw new HttpError(503, "Private object storage belum dikonfigurasi.");
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || "auto",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
};
export async function putUrl(key: string, contentType: string) {
  return getSignedUrl(
    s3(),
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 900 },
  );
}
export async function checkObject(key: string) {
  return s3().send(
    new HeadObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
  );
}
export async function download(key: string, name: string, provider: string) {
  if (provider === "s3")
    return Response.redirect(
      await getSignedUrl(
        s3(),
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: key,
          ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
        }),
        { expiresIn: 60 },
      ),
      302,
    );
  const blob = await get(key, {
    access: "private",
    token: process.env.BLOB_PRIVATE_READ_WRITE_TOKEN,
  });
  if (!blob || blob.statusCode !== 200)
    throw new HttpError(404, "File tidak ditemukan.");
  return new Response(blob.stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
