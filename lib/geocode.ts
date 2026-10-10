import "server-only";

const UA = "SafeWay/1.0 (school safety demo)";

/** Street address for a point via OSM Nominatim. Returns null on any error or after `timeoutMs`. */
export async function reverseGeocode(lat: number, lng: number, timeoutMs = 2500): Promise<string | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("accept-language", "uz,ru");
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const d = (await res.json()) as { display_name?: string; address?: Record<string, string> };
    const a = d.address ?? {};
    const short = [a.road ?? a.pedestrian ?? a.neighbourhood, a.house_number, a.suburb ?? a.city_district, a.city ?? a.town]
      .filter(Boolean)
      .join(", ");
    return (short || d.display_name || "").slice(0, 200) || null;
  } catch {
    return null;
  }
}
