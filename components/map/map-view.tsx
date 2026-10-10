"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { Circle, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { LeafletContainer } from "./leaflet-container";
import type { HazardDTO } from "@/lib/types";
import { SEVERITY_COLOR } from "@/lib/types";
import { DEFAULT_CENTER, type LatLng } from "@/lib/geo";

export interface MapRoute { geometry: LatLng[]; color: string; weight?: number; dashed?: boolean; opacity?: number }
export interface MapEndpoint { pos: LatLng; label: string; color: string }

export interface MapViewProps {
  hazards?: HazardDTO[];
  center?: LatLng;
  zoom?: number;
  className?: string;
  userPos?: LatLng | null;
  radius?: number;
  picked?: LatLng | null;
  routes?: MapRoute[];
  endpoints?: MapEndpoint[];
  flyTo?: { pos: LatLng; zoom?: number; key: number } | null;
  fitTo?: { points: LatLng[]; key: number } | null;
  onMapClick?: (p: LatLng) => void;
  onSelect?: (h: HazardDTO) => void;
  renderPopup?: (h: HazardDTO) => React.ReactNode;
}

const iconCache = new Map<string, L.DivIcon>();
function pinIcon(h: HazardDTO) {
  const key = `${h.severity}-${h.status}`;
  let icon = iconCache.get(key);
  if (!icon) {
    const c = SEVERITY_COLOR[h.severity];
    const pulse = h.severity === "high" && h.status !== "resolved";
    // High-risk pins are drawn ~35% larger so they stand out.
    const k = h.severity === "high" ? 1.35 : 1;
    const w = Math.round(34 * k), ht = Math.round(44 * k);
    icon = L.divIcon({
      className: "",
      iconSize: [w, ht],
      iconAnchor: [w / 2, ht - 2],
      popupAnchor: [0, -ht + 6],
      html: `<div class="sw-pin ${h.status === "resolved" ? "resolved" : ""}" style="--c:${c};width:${w}px;height:${ht}px">
        ${pulse ? `<span class="ring" style="left:${7 * k}px;top:${27 * k}px;width:${20 * k}px;height:${20 * k}px"></span>` : ""}
        <svg width="${w}" height="${ht}" viewBox="0 0 34 44"><path d="M17 43s14-14.2 14-25A14 14 0 0 0 3 18c0 10.8 14 25 14 25z" fill="${c}" stroke="white" stroke-width="2.5"/>
        <circle cx="17" cy="18" r="5.5" fill="white"/>${h.status === "resolved" ? '<path d="M14 18l2 2 4-4" stroke="' + c + '" stroke-width="2" fill="none"/>' : ""}</svg>
      </div>`,
    });
    iconCache.set(key, icon);
  }
  return icon;
}

const userIcon = L.divIcon({ className: "", iconSize: [18, 18], iconAnchor: [9, 9], html: '<div class="sw-dot"></div>' });
const pickedIcon = L.divIcon({
  className: "",
  iconSize: [34, 44],
  iconAnchor: [17, 42],
  html: `<div class="sw-pin"><svg width="34" height="44" viewBox="0 0 34 44"><path d="M17 43s14-14.2 14-25A14 14 0 0 0 3 18c0 10.8 14 25 14 25z" fill="#6366f1" stroke="white" stroke-width="2.5"/><circle cx="17" cy="18" r="5.5" fill="white"/></svg></div>`,
});
function endpointIcon(e: MapEndpoint) {
  return L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<div class="sw-endpoint" style="background:${e.color}">${e.label}</div>`,
  });
}

function ClickHandler({ onMapClick }: { onMapClick?: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onMapClick?.([e.latlng.lat, e.latlng.lng]) });
  return null;
}

function Controller({ flyTo, fitTo }: Pick<MapViewProps, "flyTo" | "fitTo">) {
  const map = useMap();
  useEffect(() => {
    if (flyTo) map.flyTo(flyTo.pos, flyTo.zoom ?? Math.max(map.getZoom(), 15), { duration: 0.8 });
  }, [flyTo, map]);
  useEffect(() => {
    if (fitTo && fitTo.points.length) map.flyToBounds(L.latLngBounds(fitTo.points), { padding: [48, 48], duration: 0.8 });
  }, [fitTo, map]);
  // Leaflet needs a nudge when its container is resized by layout animations.
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

export default function MapView({
  hazards = [], center = DEFAULT_CENTER, zoom = 12, className, userPos, radius, picked,
  routes = [], endpoints = [], flyTo, fitTo, onMapClick, onSelect, renderPopup,
}: MapViewProps) {
  // Draw red pins last so they sit on top.
  const sorted = useMemo(
    () => [...hazards].sort((a, b) => ["low", "medium", "high"].indexOf(a.severity) - ["low", "medium", "high"].indexOf(b.severity)),
    [hazards],
  );

  return (
    <LeafletContainer center={center} zoom={zoom} className={className}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <ClickHandler onMapClick={onMapClick} />
      <Controller flyTo={flyTo} fitTo={fitTo} />

      {routes.map((r, i) => (
        <Polyline key={`halo-${i}`} positions={r.geometry} pathOptions={{ color: "#ffffff", weight: (r.weight ?? 6) + 4, opacity: (r.opacity ?? 1) * 0.8 }} />
      ))}
      {routes.map((r, i) => (
        <Polyline
          key={`route-${i}`}
          positions={r.geometry}
          pathOptions={{ color: r.color, weight: r.weight ?? 6, opacity: r.opacity ?? 1, dashArray: r.dashed ? "8 10" : undefined, lineCap: "round", lineJoin: "round" }}
        />
      ))}

      {userPos && radius && (
        <Circle center={userPos} radius={radius} pathOptions={{ color: "#3b82f6", weight: 1.5, fillColor: "#3b82f6", fillOpacity: 0.08, dashArray: "4 6" }} />
      )}
      {userPos && <Marker position={userPos} icon={userIcon} zIndexOffset={1000} />}
      {picked && <Marker position={picked} icon={pickedIcon} zIndexOffset={2000} />}
      {endpoints.map((e) => <Marker key={e.label} position={e.pos} icon={endpointIcon(e)} zIndexOffset={1500} />)}

      {sorted.map((h) => (
        <Marker
          key={h.id}
          position={[h.lat, h.lng]}
          icon={pinIcon(h)}
          eventHandlers={{ click: () => onSelect?.(h) }}
        >
          {renderPopup && <Popup maxWidth={280} minWidth={240}>{renderPopup(h)}</Popup>}
        </Marker>
      ))}
    </LeafletContainer>
  );
}
