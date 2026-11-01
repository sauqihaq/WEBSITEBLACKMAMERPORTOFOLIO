import { Resend } from "resend";
import nodemailer from "nodemailer";
import { db } from "./db";

const useGmail = () =>
  Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
const useResend = () =>
  Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

/** True when any mail provider (Gmail SMTP or Resend) is configured. */
export const mailConfigured = () => useGmail() || useResend();

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

type Sender = (job: {
  key: string;
  to: string;
  subject: string;
  text: string;
}) => Promise<boolean>;

function buildSender(): Sender | null {
  if (useGmail()) {
    const user = process.env.GMAIL_USER as string;
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass: process.env.GMAIL_APP_PASSWORD as string },
    });
    // Gmail always sends from the authenticated account; EMAIL_FROM only sets the display name.
    const from = process.env.EMAIL_FROM || `"BLACKMAMERSTUDIO" <${user}>`;
    return async (job) => {
      await transporter.sendMail({
        from,
        to: job.to,
        subject: job.subject,
        text: job.text,
      });
      return true;
    };
  }
  if (useResend()) {
    const client = new Resend(process.env.RESEND_API_KEY);
    return async (job) => {
      const result = await client.emails.send(
        {
          from: process.env.EMAIL_FROM as string,
          to: job.to,
          subject: job.subject,
          text: job.text,
        },
        { idempotencyKey: job.key },
      );
      return !result.error;
    };
  }
  return null;
}

export async function flushMail() {
  const send = buildSender();
  if (!send) return;
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
      if (await send(job))
        await db.emailJob.update({
          where: { id: job.id },
          data: { sentAt: new Date() },
        });
    } catch {
      /* The persisted outbox can be retried without rolling back orders. */
    }
  }
}
