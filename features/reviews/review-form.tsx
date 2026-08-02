"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { createReviewAction } from "@/features/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ReviewFormProps {
  bookingId: string;
  targetName?: string | null;
  alreadyReviewed?: boolean;
  /** Можно ли ставить оценку (после времени выезда) */
  canReview?: boolean;
}

export function ReviewForm({
  bookingId,
  targetName,
  alreadyReviewed,
  canReview = true,
}: ReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(alreadyReviewed);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (done) {
    return (
      <p className="text-xs font-medium text-primary">
        Спасибо! Оценка сохранена
        {targetName ? ` для ${targetName}` : ""}.
      </p>
    );
  }

  if (!canReview) {
    return (
      <p className="text-xs text-muted-foreground">
        Оценку можно поставить после времени выезда
      </p>
    );
  }

  const submit = () => {
    setError(null);
    const formData = new FormData();
    formData.set("bookingId", bookingId);
    formData.set("rating", String(rating));
    if (comment.trim()) formData.set("comment", comment.trim());

    startTransition(async () => {
      const result = await createReviewAction(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDone(true);
    });
  };

  return (
    <div className="space-y-2 rounded-xl border border-amber-200/60 bg-amber-50/50 p-3">
      <p className="text-sm font-medium">
        Оценить{targetName ? ` ${targetName}` : ""}
      </p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className="p-0.5"
            aria-label={`${n} звёзд`}
          >
            <Star
              className={`h-6 w-6 ${
                n <= rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/40"
              }`}
            />
          </button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Комментарий (необязательно)"
        rows={2}
        maxLength={500}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="button" size="sm" disabled={isPending} onClick={submit}>
        {isPending ? "Сохранение..." : "Отправить оценку"}
      </Button>
    </div>
  );
}
