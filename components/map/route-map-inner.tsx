"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
  AttributionControl,
} from "react-leaflet";
import L from "leaflet";
import type { LatLng } from "@/lib/geo";

function makeIcon(color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      background:${color};border:2px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,.35);
      transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);color:#fff;font:700 11px/1 system-ui,sans-serif">${label}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

const startIcon = makeIcon("#1a73e8", "A");
const endIcon = makeIcon("#ea4335", "B");

function normalizePoints(raw: unknown): LatLng[] {
  if (!Array.isArray(raw)) return [];
  const out: LatLng[] = [];
  for (const p of raw) {
    if (!p || typeof p !== "object") continue;
    const obj = p as Record<string, unknown>;
    const lat = Number(obj.lat ?? obj.latitude);
    const lng = Number(obj.lng ?? obj.lon ?? obj.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) out.push({ lat, lng });
  }
  return out;
}

function simplifyLine(points: LatLng[], maxPoints = 400): LatLng[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const out: LatLng[] = [];
  for (let i = 0; i < points.length; i += step) out.push(points[i]);
  const last = points[points.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    map.invalidateSize();
  }, [map, points]);
  return null;
}

interface RouteMapInnerProps {
  from?: LatLng | null;
  to?: LatLng | null;
  polyline?: LatLng[];
  alternatives?: LatLng[][];
  className?: string;
  height?: number;
}

export default function RouteMapInner({
  from,
  to,
  polyline = [],
  alternatives = [],
  className = "",
  height = 192,
}: RouteMapInnerProps) {
  const mainLine = useMemo(() => {
    const poly = simplifyLine(normalizePoints(polyline));
    if (poly.length >= 2) return poly;
    return [from, to].filter(Boolean) as LatLng[];
  }, [polyline, from, to]);

  const altLines = useMemo(
    () =>
      alternatives
        .map((a) => simplifyLine(normalizePoints(a)))
        .filter((a) => a.length >= 2),
    [alternatives]
  );

  const center: [number, number] = from
    ? [from.lat, from.lng]
    : to
      ? [to.lat, to.lng]
      : [55.75, 37.62];

  return (
    <div
      className={`overflow-hidden rounded-xl border shadow-sm ${className}`}
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <AttributionControl
          prefix='<a href="https://leafletjs.com" target="_blank" rel="noreferrer">Leaflet</a>'
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />

        {altLines.map((line, i) => (
          <Polyline
            key={`alt-${i}`}
            positions={line.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{
              color: "#94a3b8",
              weight: 4,
              opacity: 0.65,
              dashArray: "8 8",
            }}
          />
        ))}

        {mainLine.length >= 2 && (
          <>
            <Polyline
              positions={mainLine.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: "#ffffff", weight: 10, opacity: 0.95 }}
            />
            <Polyline
              positions={mainLine.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: "#1a73e8", weight: 5, opacity: 1 }}
            />
          </>
        )}

        {from && (
          <Marker position={[from.lat, from.lng]} icon={startIcon}>
            <Popup>Откуда</Popup>
          </Marker>
        )}
        {to && (
          <Marker position={[to.lat, to.lng]} icon={endIcon}>
            <Popup>Куда</Popup>
          </Marker>
        )}

        <FitBounds points={mainLine} />
      </MapContainer>
    </div>
  );
}
