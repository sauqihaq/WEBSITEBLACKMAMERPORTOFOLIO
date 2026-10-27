import { db } from "@/lib/db";
import { flushMail } from "@/lib/mail";
import { verifyOrder } from "@/lib/commerce";
export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== "Bearer " + process.env.CRON_SECRET
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  await db.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await db.token.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await flushMail();
  const pending = await db.order.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: new Date(Date.now() - 300000) },
    },
    take: 10,
    orderBy: { createdAt: "asc" },
  });
  let reconciled = 0;
  for (const order of pending) {
    try {
      await verifyOrder(order.id);
      reconciled++;
    } catch {
      /* Preserve pending status until the gateway returns an authoritative result. */
    }
  }
  return Response.json({ ok: true, reconciled });
}
