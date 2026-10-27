import { randomBytes, createHash } from "node:crypto";
import { hash, compare } from "bcryptjs";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  failure,
  HttpError,
  ip,
  json,
  limit,
  sameOrigin,
} from "@/lib/security";
import { queueMail, flushMail } from "@/lib/mail";
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
export async function POST(
  req: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    sameOrigin(req);
    const { action } = await params;
    const body = await json(req);
    await limit("account:" + ip(req), 20);
    if (action === "register") {
      if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)
        throw new HttpError(
          503,
          "Registrasi belum diaktifkan: layanan email belum dikonfigurasi.",
        );
      const data = z
        .object({
          name: z.string().min(2).max(80),
          email: z.email().max(254),
          password: z.string().min(12).max(128),
        })
        .parse(body);
      const email = data.email.toLowerCase();
      if (await db.user.findUnique({ where: { email } }))
        throw new HttpError(409, "Email sudah terdaftar.");
      await db.user.create({
        data: {
          name: data.name,
          email,
          password: await hash(data.password, 12),
        },
      });
      await sendToken(email, "verify");
      return Response.json({
        message:
          "Akun dibuat. Periksa email untuk verifikasi sebelum checkout.",
      });
    }
    if (action === "forgot-password") {
      const email = z.email().parse(body.email).toLowerCase();
      await limit("reset:" + email, 3);
      if (await db.user.findUnique({ where: { email } }))
        await sendToken(email, "reset");
      return Response.json({
        message: "Jika email terdaftar, tautan pemulihan akan dikirim.",
      });
    }
    if (["reset-password", "verify-email"].includes(action)) {
      const token = z.string().min(32).parse(body.token);
      const type = action === "verify-email" ? "verify" : "reset";
      const password =
        type === "reset"
          ? await hash(z.string().min(12).max(128).parse(body.password), 12)
          : null;
      await db.$transaction(async (tx) => {
        const found = await tx.token.findUnique({
          where: { hash: digest(token) },
        });
        if (!found || found.type !== type || found.expiresAt < new Date())
          throw new HttpError(400, "Tautan tidak valid atau kedaluwarsa.");
        await tx.token.delete({ where: { hash: found.hash } });
        await tx.user.update({
          where: { email: found.email },
          data: password
            ? { password, sessionVersion: { increment: 1 } }
            : { emailVerified: new Date() },
        });
      });
      return Response.json({
        message:
          type === "verify"
            ? "Email berhasil diverifikasi."
            : "Password diperbarui. Silakan masuk kembali.",
      });
    }
    const user = await requireUser();
    if (action === "resend-verification") {
      await limit("verification:" + user.id, 3);
      await sendToken(user.email, "verify");
      return Response.json({ message: "Email verifikasi dikirim." });
    }
    if (action === "profile") {
      const data = z
        .object({
          name: z.string().min(2).max(80),
          currentPassword: z.string().optional(),
          newPassword: z.string().min(12).max(128).optional(),
          deletionRequested: z.boolean().optional(),
        })
        .parse(body);
      if (
        data.newPassword &&
        (!data.currentPassword ||
          !(await compare(data.currentPassword, user.password)))
      )
        throw new HttpError(400, "Password saat ini tidak sesuai.");
      await db.user.update({
        where: { id: user.id },
        data: {
          name: data.name,
          deletionRequested: data.deletionRequested,
          ...(data.newPassword
            ? {
                password: await hash(data.newPassword, 12),
                sessionVersion: { increment: 1 },
              }
            : {}),
        },
      });
      return Response.json({ message: "Profil diperbarui." });
    }
    if (action === "wishlist") {
      const productId = z.string().parse(body.productId);
      if (body.remove)
        await db.wishlist.deleteMany({ where: { userId: user.id, productId } });
      else
        await db.wishlist.upsert({
          where: { userId_productId: { userId: user.id, productId } },
          create: { userId: user.id, productId },
          update: {},
        });
      return Response.json({ ok: true });
    }
    if (action === "cart") {
      const items = z
        .array(z.object({ productId: z.string(), license: z.string() }))
        .max(30)
        .parse(body.items);
      await db.user.update({ where: { id: user.id }, data: { cart: items } });
      return Response.json({ ok: true });
    }
    if (action === "review") {
      const data = z
        .object({
          productId: z.string(),
          rating: z.number().int().min(1).max(5),
          text: z.string().min(10).max(2000),
        })
        .parse(body);
      if (
        !(await db.entitlement.findFirst({
          where: { userId: user.id, productId: data.productId, revoked: false },
        }))
      )
        throw new HttpError(403, "Review hanya untuk pembeli terverifikasi.");
      await db.review.upsert({
        where: {
          userId_productId: { userId: user.id, productId: data.productId },
        },
        create: { userId: user.id, ...data },
        update: { rating: data.rating, text: data.text, approved: false },
      });
      return Response.json({ message: "Review menunggu moderasi." });
    }
    throw new HttpError(404, "Tidak ditemukan.");
  } catch (e) {
    return failure(e);
  }
}
async function sendToken(email: string, type: string) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)
    throw new HttpError(503, "Layanan email belum dikonfigurasi.");
  const token = randomBytes(32).toString("hex");
  await db.token.create({
    data: {
      hash: digest(token),
      email,
      type,
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  const link =
    process.env.NEXTAUTH_URL +
    "/" +
    (type === "verify" ? "verify-email" : "reset-password") +
    "?token=" +
    token;
  await queueMail(
    "token-" + digest(token),
    email,
    type === "verify"
      ? "Verifikasi email — BLACKMAMERSTUDIO"
      : "Atur ulang password",
    link + "\nTautan berlaku selama 1 jam.",
  );
  await flushMail();
}
