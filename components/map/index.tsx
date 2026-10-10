"use client";

import dynamic from "next/dynamic";

/** Leaflet touches `window`, so the map only renders in the browser. */
export const MapView = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-zinc-200/60 dark:bg-zinc-800/60" />,
});

export type { MapViewProps, MapRoute, MapEndpoint } from "./map-view";
