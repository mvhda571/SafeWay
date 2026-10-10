/** Address search proxied to OSM Nominatim (needs a User-Agent, so it runs server-side). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 3) return Response.json({ results: [] });
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "uz");
  try {
    const res = await fetch(url, { headers: { "User-Agent": "SafeWay/1.0 (school safety demo)" } });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { display_name: string; lat: string; lon: string }[];
    return Response.json({
      results: data.map((r) => ({ name: r.display_name, lat: Number(r.lat), lng: Number(r.lon) })),
    });
  } catch {
    return Response.json({ results: [], error: "Geocoding unavailable" }, { status: 502 });
  }
}
