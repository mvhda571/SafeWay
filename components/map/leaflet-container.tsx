"use client";

import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { LeafletContext, createLeafletContext, type LeafletContextInterface } from "@react-leaflet/core";
import type { LatLng } from "@/lib/geo";

/**
 * Drop-in replacement for react-leaflet's MapContainer.
 *
 * MapContainer removes the Leaflet map in an effect cleanup but never recreates it, so when React
 * re-runs effects on the same DOM node (Strict Mode in dev, or <Activity> hiding/showing a route with
 * cacheComponents) child layers get added to a destroyed map ("reading 'appendChild'").
 * Here the map lives as long as its DOM node: removal is deferred and only happens if the node is
 * actually detached from the document.
 */
export function LeafletContainer({
  center, zoom, className, children,
}: { center: LatLng; zoom: number; className?: string; children: React.ReactNode }) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [context, setContext] = useState<LeafletContextInterface | null>(null);
  // Leaflet adds its own classes (leaflet-container, …) to this node. If React re-rendered a new
  // className it would overwrite them and break tile positioning, so the initial value is frozen.
  const [initialClassName] = useState(className);

  useEffect(() => {
    const node = nodeRef.current!;
    if (!mapRef.current) {
      mapRef.current = L.map(node, { zoomControl: true, attributionControl: true, scrollWheelZoom: true }).setView(center, zoom);
      setContext(createLeafletContext(mapRef.current));
    }
    return () => {
      setTimeout(() => {
        if (!node.isConnected && mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      }, 0);
    };
    // center/zoom are initial values only, like MapContainer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={nodeRef} className={initialClassName}>
      {context && <LeafletContext value={context}>{children}</LeafletContext>}
    </div>
  );
}
