import { PrismaClient, Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { defaultSettings, demoProjects } from "../src/lib/demo";
const db = new PrismaClient();
async function main() {
  const email = process.env.OWNER_EMAIL?.toLowerCase();
  const password = process.env.OWNER_PASSWORD;
  if (!email || !password || password.length < 16)
    throw new Error(
      "Set OWNER_EMAIL and OWNER_PASSWORD (minimum 16 characters) in the environment.",
    );
  const existing = await db.user.findUnique({ where: { email } });
  if (existing && existing.role !== "OWNER")
    throw new Error(
      "Refusing to elevate an existing customer. Use a new owner email or review the account directly.",
    );
  if (!existing)
    await db.user.create({
      data: {
        email,
        password: await hash(password, 12),
        name: process.env.OWNER_NAME || "BLACKMAMERSTUDIO",
        role: "OWNER",
        emailVerified: new Date(),
      },
    });
  await db.setting.upsert({
    where: { key: "site" },
    create: { key: "site", value: defaultSettings },
    update: {},
  });
  if (process.env.SEED_DEMO === "true") {
    if (process.env.NODE_ENV === "production")
      throw new Error("Demo seed disabled in production.");
    for (const p of demoProjects) {
      const { id, ...data } = p;
      await db.project.upsert({
        where: { slug: p.slug },
        create: {
          ...data,
          status: "DRAFT",
          details: data.details as Prisma.InputJsonValue,
        },
        update: {},
      });
    }
  }
  console.log(
    "Owner and studio settings are ready. Existing owner password was not changed.",
  );
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
