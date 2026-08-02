"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TripSearchData } from "@/lib/validations";

interface TripSearchProps {
  onSearch: (filters: TripSearchData) => void;
}

export function TripSearch({ onSearch }: TripSearchProps) {
  const [filters, setFilters] = useState<TripSearchData>({
    fromCity: "",
    toCity: "",
    date: "",
    alongRoute: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
  };

  const handleReset = () => {
    const empty = { fromCity: "", toCity: "", date: "", alongRoute: true };
    setFilters(empty);
    onSearch(empty);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border bg-white/90 p-4 shadow-sm backdrop-blur animate-fade-in"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="searchFrom">Откуда</Label>
          <Input
            id="searchFrom"
            placeholder="Город отправления"
            value={filters.fromCity ?? ""}
            onChange={(e) => setFilters({ ...filters, fromCity: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="searchTo">Куда</Label>
          <Input
            id="searchTo"
            placeholder="Город прибытия"
            value={filters.toCity ?? ""}
            onChange={(e) => setFilters({ ...filters, toCity: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="searchDate">Дата</Label>
          <Input
            id="searchDate"
            type="date"
            value={filters.date ?? ""}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          className="h-4 w-4 accent-primary"
          checked={Boolean(filters.alongRoute)}
          onChange={(e) => setFilters({ ...filters, alongRoute: e.target.checked })}
        />
        Искать также поездки по пути (до ~35 км объезда)
      </label>

      <div className="flex gap-2">
        <Button type="submit" size="lg" className="flex-1">
          Найти
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={handleReset}>
          Сбросить
        </Button>
      </div>
    </form>
  );
}
