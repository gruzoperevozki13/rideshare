"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import {
  banUser,
  deleteTripAdmin,
  unbanUser,
} from "@/services/admin.service";

export async function banUserAction(userId: string) {
  try {
    const admin = await requireAdmin();
    if (admin.id === userId) {
      return { error: "Нельзя заблокировать свой аккаунт" };
    }
    await banUser(userId);
    revalidatePath("/admin/users");
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Ошибка",
    };
  }
}

export async function unbanUserAction(userId: string) {
  try {
    await requireAdmin();
    await unbanUser(userId);
    revalidatePath("/admin/users");
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Ошибка",
    };
  }
}

export async function deleteTripAdminAction(tripId: string) {
  try {
    await requireAdmin();
    await deleteTripAdmin(tripId);
    revalidatePath("/admin/trips");
    revalidatePath("/");
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Ошибка",
    };
  }
}
