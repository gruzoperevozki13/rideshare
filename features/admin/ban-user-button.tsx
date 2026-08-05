"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { banUserAction, unbanUserAction } from "@/features/admin/actions";
import { Button } from "@/components/ui/button";

export function BanUserButton({
  userId,
  banned,
}: {
  userId: string;
  banned: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant={banned ? "outline" : "destructive"}
      disabled={pending}
      onClick={() => {
        start(async () => {
          const r = banned
            ? await unbanUserAction(userId)
            : await banUserAction(userId);
          if (r.error) {
            alert(r.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      {pending ? "…" : banned ? "Разблокировать" : "Заблокировать"}
    </Button>
  );
}
