import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Error thrown by `api()`; `code` maps to the `err.<code>` i18n key, `data` is the full JSON body. */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public data: Record<string, unknown> = {}) {
    super(message);
  }
}

/** "Dilnoza Karimova" → "DK" (avatar fallback). */
export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError(0, "network", "Network error");
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(res.status, (data.code as string) ?? "internal", (data.error as string) ?? `HTTP ${res.status}`, data);
  }
  return data as T;
}

export function jsonInit(method: string, body?: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) };
}

/** Current GPS fix with its accuracy radius in metres. Rejects with a GeolocationPositionError-like object. */
export function getFix(): Promise<{ pos: [number, number]; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject({ code: 2 });
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ pos: [p.coords.latitude, p.coords.longitude], accuracy: p.coords.accuracy }),
      reject,
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 },
    );
  });
}

export async function getPosition(): Promise<[number, number]> {
  return (await getFix()).pos;
}

/** i18n key for a geolocation failure: permission denied vs. no signal / timeout. */
export function geoErrorKey(e: unknown): "nearby.denied" | "nearby.unavailable" {
  return (e as { code?: number })?.code === 1 ? "nearby.denied" : "nearby.unavailable";
}

const MAX_SIDE = 1280;
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Downscales a photo in the browser to ≤ 1280 px on the longest side and re-encodes it as JPEG,
 * lowering quality until it fits in 2 MB. EXIF orientation is applied by the browser.
 */
export async function shrinkImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(async () => {
    // Fallback for browsers without createImageBitmap options.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  });
  const w0 = "naturalWidth" in bitmap ? bitmap.naturalWidth : bitmap.width;
  const h0 = "naturalHeight" in bitmap ? bitmap.naturalHeight : bitmap.height;
  const scale = Math.min(1, MAX_SIDE / Math.max(w0, h0));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w0 * scale);
  canvas.height = Math.round(h0 * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // transparent PNGs → white, not black, in JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if ("close" in bitmap) bitmap.close();
  for (const q of [0.85, 0.75, 0.6, 0.45, 0.3]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (blob && blob.size <= MAX_BYTES) return new File([blob], "photo.jpg", { type: "image/jpeg" });
  }
  throw new Error("too_large");
}
