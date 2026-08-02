"use client";

import { useQuery } from "@tanstack/react-query";
import { TripSearchData } from "@/lib/validations";

export type WishSearchItem = {
  id: string;
  fromCity: string;
  toCity: string;
  fromLat?: number | null;
  fromLng?: number | null;
  toLat?: number | null;
  toLng?: number | null;
  date: string;
  seats: number;
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
  if (filters.fromCity) params.set("fromCity", filters.fromCity);
  if (filters.toCity) params.set("toCity", filters.toCity);
  if (filters.date) params.set("date", filters.date);
  if (filters.alongRoute) params.set("alongRoute", "true");

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
