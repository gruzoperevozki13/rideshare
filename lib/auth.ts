import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/services/auth.service";

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
      return token;
    },
    async session({ session, token, user }) {
      if (session.user) {
        const userId = user?.id ?? (token.id as string);
        session.user.id = userId;

        if (userId) {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, phone: true },
          });
          session.user.role = dbUser?.role ?? null;
          session.user.phone = dbUser?.phone ?? null;
        }
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
