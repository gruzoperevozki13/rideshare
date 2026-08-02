"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  getMessagesAction,
  sendMessageAction,
  getCargoMessagesAction,
  sendCargoMessageAction,
} from "@/features/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatMessage = {
  id: string;
  body: string;
  createdAt: string | Date;
  senderId: string;
  sender: { id: string; name: string | null; image: string | null };
};

interface BookingChatProps {
  bookingId: string;
  currentUserId: string;
  /** По умолчанию чат поездок; для груза — "cargo" */
  kind?: "ride" | "cargo";
}

export function BookingChat({
  bookingId,
  currentUserId,
  kind = "ride",
}: BookingChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const result =
      kind === "cargo"
        ? await getCargoMessagesAction(bookingId)
        : await getMessagesAction(bookingId);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessages(result.messages as ChatMessage[]);
    setError(null);
  }, [bookingId, kind]);

  useEffect(() => {
    if (!open) return;
    void load();
    const timer = setInterval(() => {
      void load();
    }, 4000);
    return () => clearInterval(timer);
  }, [open, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    startTransition(async () => {
      const result =
        kind === "cargo"
          ? await sendCargoMessageAction(bookingId, body)
          : await sendMessageAction(bookingId, body);
      if (result.error) {
        setError(result.error);
        return;
      }
      setText("");
      await load();
    });
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Скрыть чат" : "Чат"}
      </Button>

      {open && (
        <div className="rounded-xl border bg-muted/30 p-3 space-y-3">
          <div className="h-48 overflow-y-auto space-y-2 rounded-lg bg-background p-2">
            {messages.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-8">
                Напишите первое сообщение
              </p>
            )}
            {messages.map((m) => {
              const mine = m.senderId === currentUserId;
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {!mine && (
                      <p className="mb-0.5 text-[10px] opacity-70">
                        {m.sender.name ?? "Пользователь"}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Сообщение…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              maxLength={1000}
            />
            <Button type="button" size="sm" disabled={isPending || !text.trim()} onClick={send}>
              →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
