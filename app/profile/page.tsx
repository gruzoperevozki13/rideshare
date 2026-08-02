import { redirect } from "next/navigation";
import { getSession, getCurrentUser } from "@/lib/session";
import { ProfileForm } from "@/features/profile/profile-form";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display mb-6 text-2xl font-semibold">Профиль</h1>
      <ProfileForm user={user} />
    </div>
  );
}
