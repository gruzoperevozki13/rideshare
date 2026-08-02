import { getServerSession } from "next-auth";
import type { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
