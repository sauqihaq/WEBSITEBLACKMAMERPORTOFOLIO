import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { checkout, verifyOrder, validSignature } from "@/lib/commerce";
import { failure, HttpError, json, limit, sameOrigin } from "@/lib/security";
import { db } from "@/lib/db";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await params;
    if (action === "webhook") {
      const body = await json(req);
      if (
        !process.env.MIDTRANS_SERVER_KEY ||
        !validSignature(
          String(body.order_id),
          String(body.status_code),
          String(body.gross_amount),
          String(body.signature_key),
          process.env.MIDTRANS_SERVER_KEY,
        )
      )
        throw new HttpError(403, "Signature tidak valid.");
      await verifyOrder(String(body.order_id));
      return Response.json({ ok: true });
    }
    sameOrigin(req);
    const user = await requireUser();
    await limit("commerce:" + user.id, 30, 60);
    const body = await json(req);
    if (action === "checkout") {
      if (!user.emailVerified)
        throw new HttpError(403, "Verifikasi email Anda sebelum checkout.");
      const data = z
        .object({
          items: z
            .array(z.object({ productId: z.string(), license: z.string() }))
            .min(1)
            .max(30),
          coupon: z.string().max(40).optional(),
        })
        .parse(body);
      return Response.json(
        await checkout(user.id, data.items, data.coupon || undefined),
      );
    }
    if (action === "reconcile") {
      const order = await db.order.findFirst({
        where: { id: z.string().parse(body.orderId), userId: user.id },
      });
      if (!order) throw new HttpError(404, "Order tidak ditemukan.");
      return Response.json({ status: await verifyOrder(order.id) });
    }
    throw new HttpError(404, "Tidak ditemukan.");
  } catch (e) {
    return failure(e);
  }
}
