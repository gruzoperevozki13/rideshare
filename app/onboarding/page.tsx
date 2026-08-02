import { redirect } from "next/navigation";
import { getSession, getCurrentUser } from "@/lib/session";
import { RoleSelector } from "@/features/auth/role-selector";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  const user = await getCurrentUser();

  // Роль выбирается при каждом входе — показываем селектор, пока роль не выбрана в этой сессии
  if (user?.role) {
    redirect("/");
  }

  return <RoleSelector initialPhone={user?.phone} />;
}
