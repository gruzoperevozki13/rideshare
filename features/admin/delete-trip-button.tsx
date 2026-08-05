"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteTripAdminAction } from "@/features/admin/actions";
import { Button } from "@/components/ui/button";

export function DeleteTripButton({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm("Удалить поездку и связанные брони?")) return;
        start(async () => {
          const r = await deleteTripAdminAction(tripId);
          if (r.error) {
            alert(r.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      {pending ? "…" : "Удалить"}
    </Button>
  );
}
