import { Resend } from "resend";
import { db } from "./db";
export async function queueMail(
  key: string,
  to: string,
  subject: string,
  text: string,
) {
  await db.emailJob.upsert({
    where: { key },
    create: { key, to, subject, text },
    update: {},
  });
}
export async function flushMail() {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return;
  const client = new Resend(process.env.RESEND_API_KEY);
  const jobs = await db.emailJob.findMany({
    where: { sentAt: null, attempts: { lt: 5 } },
    take: 20,
  });
  for (const job of jobs) {
    try {
      await db.emailJob.update({
        where: { id: job.id },
        data: { attempts: { increment: 1 } },
      });
      const result = await client.emails.send(
        {
          from: process.env.EMAIL_FROM,
          to: job.to,
          subject: job.subject,
          text: job.text,
        },
        { idempotencyKey: job.key },
      );
      if (!result.error)
        await db.emailJob.update({
          where: { id: job.id },
          data: { sentAt: new Date() },
        });
    } catch {
      /* The persisted outbox can be retried without rolling back orders. */
    }
  }
}
