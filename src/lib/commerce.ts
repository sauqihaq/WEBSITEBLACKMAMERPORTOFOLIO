import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { HttpError } from "./security";
import { queueMail, flushMail } from "./mail";
export function discountTotal(total: number, type: string, value: number) {
  if (
    !Number.isSafeInteger(total) ||
    total < 0 ||
    !Number.isSafeInteger(value) ||
    value < 0
  )
    throw new Error("Invalid amount");
  return Math.min(
    total,
    type === "PERCENT"
      ? Math.floor((total * Math.min(value, 100)) / 100)
      : value,
  );
}
export function validSignature(
  orderId: string,
  code: string,
  amount: string,
  signature: string,
  key: string,
) {
  const expected = createHash("sha512")
    .update(orderId + code + amount + key)
    .digest("hex");
  if (!/^[a-f0-9]{128}$/i.test(signature)) return false;
  return timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signature, "hex"),
  );
}
export function paymentState(status: string, fraud?: string) {
  if (
    (status === "settlement" && (!fraud || fraud === "accept")) ||
    (status === "capture" && fraud === "accept")
  )
    return "PAID";
  if (
    ["refund", "partial_refund", "chargeback", "partial_chargeback"].includes(
      status,
    )
  )
    return "REFUNDED";
  if (status === "expire") return "EXPIRED";
  if (["deny", "cancel", "failure"].includes(status)) return "FAILED";
  return "PENDING";
}
export function gateway() {
  if (!process.env.MIDTRANS_SERVER_KEY)
    throw new HttpError(
      503,
      "Pembayaran belum diaktifkan. Midtrans belum dikonfigurasi.",
    );
  const production = process.env.MIDTRANS_PRODUCTION === "true";
  return {
    api: production
      ? "https://api.midtrans.com"
      : "https://api.sandbox.midtrans.com",
    snap: production
      ? "https://app.midtrans.com"
      : "https://app.sandbox.midtrans.com",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(process.env.MIDTRANS_SERVER_KEY + ":").toString("base64"),
      "Content-Type": "application/json",
    },
  };
}
export async function verifyOrder(orderId: string) {
  const g = gateway();
  const response = await fetch(
    g.api + "/v2/" + encodeURIComponent(orderId) + "/status",
    {
      headers: g.headers,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok)
    throw new HttpError(502, "Status pembayaran belum tersedia.");
  const data = await response.json();
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: true },
  });
  if (
    !order ||
    data.order_id !== order.id ||
    Number(data.gross_amount) !== order.total ||
    data.currency !== "IDR"
  )
    throw new HttpError(400, "Data pembayaran tidak cocok.");
  const next = paymentState(data.transaction_status, data.fraud_status);
  await db.$transaction(
    async (tx) => {
      const current = await tx.order.findUniqueOrThrow({
        where: { id: order.id },
      });
      if (current.status === "REFUNDED") return;
      if (current.status === "PAID" && !["PAID", "REFUNDED"].includes(next))
        return;
      await tx.payment.upsert({
        where: {
          gatewayId_status: {
            gatewayId: String(data.transaction_id),
            status: String(data.transaction_status),
          },
        },
        create: {
          orderId: order.id,
          gatewayId: String(data.transaction_id),
          status: String(data.transaction_status),
          method: data.payment_type,
        },
        update: {},
      });
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: next,
          gatewayId: String(data.transaction_id),
          ...(next === "PAID" && !current.paidAt ? { paidAt: new Date() } : {}),
        },
      });
      if (next === "PAID") {
        for (const item of order.items)
          await tx.entitlement.upsert({
            where: { orderItemId: item.id },
            create: {
              orderItemId: item.id,
              userId: order.userId,
              productId: item.productId,
            },
            update: {},
          });
        await tx.emailJob.upsert({
          where: { key: "receipt-" + order.id },
          create: {
            key: "receipt-" + order.id,
            to: order.user.email,
            subject: "Pembayaran diterima — BLACKMAMERSTUDIO",
            text:
              "Pembayaran untuk order " +
              order.id +
              " telah diverifikasi. Aset tersedia di " +
              process.env.NEXTAUTH_URL +
              "/account/downloads",
          },
          update: {},
        });
      }
      if (next === "REFUNDED")
        await tx.entitlement.updateMany({
          where: { orderItemId: { in: order.items.map((i) => i.id) } },
          data: { revoked: true },
        });
    },
    { isolationLevel: "Serializable" },
  );
  await flushMail();
  return next;
}
export async function checkout(
  userId: string,
  items: { productId: string; license: string }[],
  couponCode?: string,
) {
  const unique = new Set(items.map((i) => i.productId + ":" + i.license));
  if (unique.size !== items.length)
    throw new HttpError(400, "Produk dan lisensi duplikat.");
  const order = await db.$transaction(
    async (tx) => {
      const snapshots = [];
      for (const item of items) {
        const p = await tx.product.findFirst({
          where: { id: item.productId, status: "PUBLISHED" },
          include: { prices: true, files: true },
        });
        const price = p?.prices.find((x) => x.license === item.license);
        if (!p || !price || !p.files.length)
          throw new HttpError(
            400,
            "Produk belum tersedia atau lisensi tidak valid.",
          );
        snapshots.push({
          productId: p.id,
          title: p.title,
          license: price.license,
          terms: price.terms,
          amount: price.amount,
        });
      }
      const subtotal = snapshots.reduce((s, p) => s + p.amount, 0);
      let discount = 0;
      if (couponCode) {
        const c = await tx.coupon.findUnique({
          where: { code: couponCode.toUpperCase() },
        });
        if (
          !c ||
          !c.active ||
          (c.expiresAt && c.expiresAt < new Date()) ||
          (c.maxUses !== null && c.uses >= c.maxUses) ||
          subtotal < c.minimum
        )
          throw new HttpError(
            400,
            "Kupon tidak tersedia atau syarat belum terpenuhi.",
          );
        const eligible = snapshots
          .filter(
            (i) => !c.productIds.length || c.productIds.includes(i.productId),
          )
          .reduce((s, i) => s + i.amount, 0);
        discount = discountTotal(eligible, c.type, c.value);
        await tx.coupon.update({
          where: { id: c.id },
          data: { uses: { increment: 1 } },
        });
      }
      const total = subtotal - discount;
      if (total > 2_000_000_000)
        throw new HttpError(
          400,
          "Total order melebihi batas. Pisahkan order Anda.",
        );
      if (total > 0) gateway();
      const created = await tx.order.create({
        data: {
          userId,
          total,
          discount,
          couponCode: couponCode?.toUpperCase(),
          items: { create: snapshots },
          ...(total === 0 ? { status: "PAID", paidAt: new Date() } : {}),
        },
        include: { items: true, user: true },
      });
      if (total === 0)
        for (const item of created.items)
          await tx.entitlement.create({
            data: { userId, orderItemId: item.id, productId: item.productId },
          });
      return created;
    },
    { isolationLevel: "Serializable" },
  );
  if (order.total === 0) {
    await queueMail(
      "receipt-" + order.id,
      order.user.email,
      "Aset tersedia",
      "Aset gratis tersedia di library akun Anda.",
    );
    await flushMail();
    return { orderId: order.id, free: true };
  }
  try {
    const g = gateway();
    const response = await fetch(g.snap + "/snap/v1/transactions", {
      method: "POST",
      headers: g.headers,
      body: JSON.stringify({
        transaction_details: { order_id: order.id, gross_amount: order.total },
        customer_details: {
          first_name: order.user.name,
          email: order.user.email,
        },
        callbacks: {
          finish:
            process.env.NEXTAUTH_URL + "/checkout/success?order=" + order.id,
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("Gateway failed");
    const data = await response.json();
    await db.order.update({
      where: { id: order.id },
      data: { snapToken: data.token, paymentUrl: data.redirect_url },
    });
    return { orderId: order.id, url: data.redirect_url };
  } catch {
    throw new HttpError(
      502,
      "Order tersimpan, tetapi gateway belum merespons. Periksa status melalui Akun sebelum mencoba lagi.",
    );
  }
}
