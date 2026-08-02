"use client";

import { useQuery } from "@tanstack/react-query";
import { TripSearchData } from "@/lib/validations";
import { TripCardData } from "@/features/trips/trip-card";

async function fetchTrips(filters: TripSearchData): Promise<TripCardData[]> {
  const params = new URLSearchParams();
  if (filters.fromCity) params.set("fromCity", filters.fromCity);
  if (filters.toCity) params.set("toCity", filters.toCity);
  if (filters.date) params.set("date", filters.date);
  if (filters.alongRoute) params.set("alongRoute", "true");

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
