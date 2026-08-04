"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CityInputProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoComplete?: string;
};

export function CityInput({
  value,
  onChange,
  onBlur,
  name,
  id,
  placeholder = "Город, улица, дом",
  disabled,
  className,
  autoComplete = "off",
}: CityInputProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cities?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { cities?: string[] };
      setItems(data.cities ?? []);
      setHighlight(0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      void fetchSuggestions(value);
    }, 280);
    return () => clearTimeout(t);
  }, [value, open, fetchSuggestions]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (city: string) => {
    onChange(city);
    setOpen(false);
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setOpen(true);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(items[highlight] ?? items[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <Input
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoComplete}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className={className}
        onChange={onInputChange}
        onFocus={() => {
          setOpen(true);
          void fetchSuggestions(value);
        }}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />

      {open && (items.length > 0 || loading) && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-white py-1 shadow-lg"
        >
          {loading && items.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">Ищем адрес…</li>
          )}
          {items.map((city, i) => (
            <li key={`${city}-${i}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === highlight}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm leading-snug hover:bg-primary/10",
                  i === highlight && "bg-primary/10"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(city)}
                onMouseEnter={() => setHighlight(i)}
              >
                {city}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
