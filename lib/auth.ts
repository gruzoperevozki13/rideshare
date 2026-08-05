import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/services/auth.service";
import { isEmailAdmin } from "@/lib/admin-access";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    id: "credentials",
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error("Укажите email и пароль");
      }

      const email = credentials.email.toLowerCase().trim();
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user?.passwordHash) {
        throw new Error("Неверный email или пароль");
      }

      const ok = await verifyPassword(credentials.password, user.passwordHash);
      if (!ok) {
        throw new Error("Неверный email или пароль");
      }

      if (!user.emailVerified) {
        throw new Error("EMAIL_NOT_VERIFIED");
      }

      if (user.bannedAt) {
        throw new Error("Аккаунт заблокирован");
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),
];

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers,
  pages: {
    signIn: "/login",
    verifyRequest: "/login/verify",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      if (!token.id) return token;

      const dbUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: {
          bannedAt: true,
          isAdmin: true,
          email: true,
          role: true,
          phone: true,
        },
      });

      if (!dbUser || dbUser.bannedAt) {
        token.banned = true;
        token.isAdmin = false;
        return token;
      }

      token.banned = false;
      token.isAdmin = dbUser.isAdmin || isEmailAdmin(dbUser.email);
      token.role = dbUser.role;
      token.phone = dbUser.phone;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.banned) {
          session.user.id = "";
          session.user.isAdmin = false;
          return session;
        }
        session.user.id = (token.id as string) ?? "";
        session.user.role = token.role ?? null;
        session.user.phone = token.phone ?? null;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
