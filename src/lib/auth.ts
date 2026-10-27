import { getServerSession, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { db } from "./db";
import { HttpError, limit, requireDatabase } from "./security";
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(input) {
        requireDatabase();
        const parsed = z
          .object({
            email: z.email().max(254),
            password: z.string().min(1).max(128),
          })
          .safeParse(input);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();
        await limit("login:" + email, 10);
        const user = await db.user.findUnique({ where: { email } });
        if (!user || !(await compare(parsed.data.password, user.password)))
          return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const current = await db.user.findUnique({ where: { id: user.id } });
        token.version = current?.sessionVersion;
      }
      return token;
    },
    async session({ session, token }) {
      const current = await db.user.findUnique({ where: { id: token.sub } });
      if (current && current.sessionVersion === token.version) {
        session.user = { ...session.user, id: current.id, role: current.role };
      } else session.user = undefined;
      return session;
    },
  },
};
export async function requireUser() {
  requireDatabase();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    throw new HttpError(401, "Silakan masuk terlebih dahulu.");
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) throw new HttpError(401, "Sesi berakhir.");
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (!["OWNER", "ADMIN"].includes(user.role))
    throw new HttpError(403, "Akses admin diperlukan.");
  return user;
}
