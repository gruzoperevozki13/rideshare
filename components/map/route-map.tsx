"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { LatLng } from "@/lib/geo";

const RouteMapInner = dynamic(() => import("./route-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="h-48 w-full animate-pulse rounded-xl bg-muted" />
  ),
});

interface RouteMapProps {
  from?: LatLng | null;
  to?: LatLng | null;
  polyline?: LatLng[];
  /** Alternate routes shown dimmed (for route picker) */
  alternatives?: LatLng[][];
  className?: string;
  height?: number;
}

function hasRoadGeometry(polyline?: LatLng[] | null) {
  return Boolean(polyline && polyline.length >= 3);
}

export function RouteMap(props: RouteMapProps) {
  const { from, to, polyline, alternatives, className, height } = props;
  const [roadLine, setRoadLine] = useState<LatLng[] | null>(null);
  const [loadingRoad, setLoadingRoad] = useState(false);

  const needsRoadFetch = Boolean(
    from && to && !hasRoadGeometry(polyline)
  );

  useEffect(() => {
    if (!needsRoadFetch || !from || !to) {
      setRoadLine(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    setLoadingRoad(true);
    const url =
      `/api/routes?fromLat=${from.lat}&fromLng=${from.lng}` +
      `&toLat=${to.lat}&toLng=${to.lng}`;

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{
          routes?: { points: LatLng[]; isFallback?: boolean }[];
        }>;
      })
      .then((data) => {
        if (cancelled || !data?.routes?.[0]?.points) return;
        const points = data.routes[0].points;
        if (points.length >= 3) setRoadLine(points);
        else setRoadLine(null);
      })
      .catch(() => {
        if (!cancelled) setRoadLine(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingRoad(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [needsRoadFetch, from?.lat, from?.lng, to?.lat, to?.lng]);

  const effectivePolyline = useMemo(() => {
    if (hasRoadGeometry(polyline)) return polyline;
    if (hasRoadGeometry(roadLine)) return roadLine ?? undefined;
    return polyline;
  }, [polyline, roadLine]);

  if (!from && !to && (!polyline || polyline.length === 0)) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground ${className ?? ""}`}
        style={{ height: height ?? 192 }}
      >
        Карта появится после указания городов
      </div>
    );
  }

  return (
    <div className="relative">
      {loadingRoad && (
        <p className="absolute right-2 top-2 z-[500] rounded-md bg-white/90 px-2 py-1 text-[10px] text-muted-foreground shadow">
          Строим маршрут по дорогам…
        </p>
      )}
      <RouteMapInner
        from={from}
        to={to}
        polyline={effectivePolyline}
        alternatives={alternatives}
        className={className}
        height={height}
      />
    </div>
  );
}
