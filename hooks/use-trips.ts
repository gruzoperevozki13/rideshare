"use client";

import { useQuery } from "@tanstack/react-query";
import { TripSearchData } from "@/lib/validations";
import { TripCardData } from "@/features/trips/trip-card";
import { appendSearchParams } from "@/lib/search-filters";

async function fetchTrips(filters: TripSearchData): Promise<TripCardData[]> {
  const params = new URLSearchParams();
  appendSearchParams(params, {
    fromCity: filters.fromCity,
    toCity: filters.toCity,
    date: filters.date,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    seatsMin: filters.seatsMin,
    sortBy: filters.sortBy,
    alongRoute: filters.alongRoute,
  });

  const res = await fetch(`/api/trips?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch trips");
  return res.json();
}

export function useTrips(filters: TripSearchData = {}) {
  return useQuery({
    queryKey: ["trips", filters],
    queryFn: () => fetchTrips(filters),
  });
}
