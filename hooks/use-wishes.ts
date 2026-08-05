"use client";

import { useQuery } from "@tanstack/react-query";
import { TripSearchData } from "@/lib/validations";
import { appendSearchParams } from "@/lib/search-filters";

export type WishSearchItem = {
  id: string;
  fromCity: string;
  toCity: string;
  fromLat?: number | null;
  fromLng?: number | null;
  toLat?: number | null;
  toLng?: number | null;
  date: string;
  time?: string | null;
  seats: number;
  price: number;
  comment: string | null;
  status: string;
  alreadyProposed?: boolean;
  passenger: {
    id: string;
    name: string | null;
    image: string | null;
    rating: number;
    phone: string | null;
  };
};

async function fetchWishes(filters: TripSearchData): Promise<WishSearchItem[]> {
  const params = new URLSearchParams();
  appendSearchParams(params, {
    fromCity: filters.fromCity,
    toCity: filters.toCity,
    date: filters.date,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    seatsMin: filters.seatsMin,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    sortBy: filters.sortBy,
    alongRoute: filters.alongRoute,
  });

  const res = await fetch(`/api/wishes?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch wishes");
  return res.json();
}

export function useWishSearch(filters: TripSearchData, enabled = true) {
  return useQuery({
    queryKey: ["wishes", filters],
    queryFn: () => fetchWishes(filters),
    enabled,
  });
}
