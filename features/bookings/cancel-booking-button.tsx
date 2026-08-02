"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelBookingAction,
  cancelCargoBookingAction,
} from "@/features/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  bookingId: string;
  kind?: "ride" | "cargo";
  /** Подпись кнопки */
  label?: string;
  variant?: "outline" | "destructive" | "ghost";
  size?: "sm" | "default";
  className?: string;
};

export function CancelBookingButton({
  bookingId,
  kind = "ride",
  label = "Отменить бронь",
  variant = "outline",
  size = "sm",
  className,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result =
        kind === "cargo"
          ? await cancelCargoBookingAction(bookingId, reason)
          : await cancelBookingAction(bookingId, reason);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setReason("");
      router.refresh();
    });
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-destructive/25 bg-destructive/5 p-3">
      <Label htmlFor={`cancel-reason-${bookingId}`}>Причина отмены</Label>
      <Textarea
        id={`cancel-reason-${bookingId}`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Например: изменились планы, не могу выехать…"
        rows={3}
        maxLength={500}
        className="resize-none bg-white/80"
      />
      <p className="text-[11px] text-muted-foreground">
        Другая сторона увидит, что бронь отменена. Укажите причину (от 5 символов).
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="destructive"
          className="flex-1"
          disabled={isPending || reason.trim().length < 5}
          onClick={submit}
        >
          {isPending ? "Отмена…" : "Подтвердить отмену"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Назад
        </Button>
      </div>
    </div>
  );
}
