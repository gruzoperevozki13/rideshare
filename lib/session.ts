import { getServerSession } from "next-auth";
import type { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailAdmin } from "@/lib/admin-access";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user?.id) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id },
  });
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("Войдите в аккаунт");
  }
  return session.user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireAuth();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (!dbUser?.role || !roles.includes(dbUser.role)) {
    throw new Error("Недостаточно прав для этого действия");
  }
  return user;
}

export { isEmailAdmin };

export async function isUserAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, isAdmin: true, bannedAt: true },
  });
  if (!user || user.bannedAt) return false;
  return user.isAdmin || isEmailAdmin(user.email);
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  const ok = await isUserAdmin(session.user.id);
  if (!ok) {
    throw new Error("FORBIDDEN");
  }
  return session.user;
}
