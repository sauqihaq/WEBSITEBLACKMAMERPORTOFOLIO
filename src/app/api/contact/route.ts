import { z } from "zod";
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
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await limit("contact:" + ip(req), 5, 3600);
    const data = z
      .object({
        name: z.string().min(2).max(100),
        email: z.email(),
        subject: z.string().min(2).max(200),
        message: z.string().min(20).max(10000),
        kind: z.enum(["CONTACT", "COMMISSION"]).default("CONTACT"),
        company: z.string().max(100).optional(),
        budget: z.string().max(100).optional(),
        deadline: z.string().max(30).optional(),
        website: z.string().max(0),
        turnstileToken: z.string().optional(),
      })
      .parse(await json(req));
    if (process.env.TURNSTILE_SECRET_KEY) {
      const form = new FormData();
      form.set("secret", process.env.TURNSTILE_SECRET_KEY);
      form.set("response", data.turnstileToken || "");
      const check = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        { method: "POST", body: form },
      );
      if (!(await check.json()).success)
        throw new HttpError(400, "Verifikasi anti-spam gagal.");
    }
    const inquiry = await db.inquiry.create({
      data: {
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
        kind: data.kind,
        details: {
          company: data.company || "",
          budget: data.budget || "",
          deadline: data.deadline || "",
        },
      },
    });
    if (process.env.ADMIN_EMAIL)
      await queueMail(
        "inquiry-admin-" + inquiry.id,
        process.env.ADMIN_EMAIL,
        "Inquiry baru: " + data.subject,
        "Pesan baru tersimpan di dashboard. Buka " +
          process.env.NEXTAUTH_URL +
          "/admin/messages",
      );
    await queueMail(
      "inquiry-confirm-" + inquiry.id,
      data.email,
      "Pesan diterima — BLACKMAMERSTUDIO",
      "Terima kasih. Pesan Anda telah tersimpan dan akan ditinjau.",
    );
    await flushMail();
    return Response.json({
      message: "Pesan tersimpan. Terima kasih sudah menghubungi studio.",
    });
  } catch (e) {
    return failure(e);
  }
}
