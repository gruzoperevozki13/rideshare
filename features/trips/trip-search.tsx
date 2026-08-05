"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CityInput } from "@/components/ui/city-input";
import { TripSearchData } from "@/lib/validations";

interface TripSearchProps {
  onSearch: (filters: TripSearchData) => void;
  /** Показывать «по пути» — для пассажиров/водителей */
  showAlongRoute?: boolean;
  /** Показывать фильтр свободных мест */
  showSeats?: boolean;
  /** Показывать фильтр цены */
  showPrice?: boolean;
}

const emptyFilters = (): TripSearchData => ({
  fromCity: "",
  toCity: "",
  date: "",
  dateFrom: "",
  dateTo: "",
  priceMin: undefined,
  priceMax: undefined,
  seatsMin: undefined,
  sortBy: "date",
  alongRoute: true,
});

export function TripSearch({
  onSearch,
  showAlongRoute = true,
  showSeats = true,
  showPrice = true,
}: TripSearchProps) {
  const [filters, setFilters] = useState<TripSearchData>(emptyFilters());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
  };

  const handleReset = () => {
    const empty = emptyFilters();
    setFilters(empty);
    onSearch(empty);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border bg-white/90 p-4 shadow-sm backdrop-blur animate-fade-in"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="searchFrom">Откуда</Label>
          <CityInput
            id="searchFrom"
            placeholder="Город, улица, дом"
            value={filters.fromCity ?? ""}
            onChange={(fromCity) => setFilters({ ...filters, fromCity })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="searchTo">Куда</Label>
          <CityInput
            id="searchTo"
            placeholder="Город, улица, дом"
            value={filters.toCity ?? ""}
            onChange={(toCity) => setFilters({ ...filters, toCity })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dateFrom">Дата от</Label>
          <Input
            id="dateFrom"
            type="date"
            value={filters.dateFrom || filters.date || ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                dateFrom: e.target.value,
                date: "",
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateTo">Дата до</Label>
          <Input
            id="dateTo"
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                dateTo: e.target.value,
                date: "",
              })
            }
          />
        </div>
        {showPrice && (
          <>
            <div className="space-y-2">
              <Label htmlFor="priceMin">Цена от, ₽</Label>
              <Input
                id="priceMin"
                type="number"
                min={0}
                placeholder="0"
                value={filters.priceMin ?? ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    priceMin: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceMax">Цена до, ₽</Label>
              <Input
                id="priceMax"
                type="number"
                min={0}
                placeholder="любая"
                value={filters.priceMax ?? ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    priceMax: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {showSeats && (
          <div className="space-y-2">
            <Label htmlFor="seatsMin">Свободных мест от</Label>
            <Input
              id="seatsMin"
              type="number"
              min={1}
              max={8}
              placeholder="1"
              value={filters.seatsMin ?? ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  seatsMin: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="sortBy">Сортировка</Label>
          <select
            id="sortBy"
            className="flex h-11 w-full rounded-xl border border-border/90 bg-white/90 px-4 text-sm"
            value={filters.sortBy ?? "date"}
            onChange={(e) =>
              setFilters({
                ...filters,
                sortBy: e.target.value as TripSearchData["sortBy"],
              })
            }
          >
            <option value="date">По дате</option>
            <option value="price_asc">Сначала дешевле</option>
            <option value="price_desc">Сначала дороже</option>
            <option value="duration">По времени в пути</option>
          </select>
        </div>
      </div>

      {showAlongRoute && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={Boolean(filters.alongRoute)}
            onChange={(e) =>
              setFilters({ ...filters, alongRoute: e.target.checked })
            }
          />
          Искать также поездки по пути (до ~35 км объезда)
        </label>
      )}

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
