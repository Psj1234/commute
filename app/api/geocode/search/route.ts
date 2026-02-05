import { NextRequest, NextResponse } from "next/server";

// NEW: Forward geocoding - convert text query to lat/lng coordinates
const GEOCODE_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_EMAIL = process.env.NOMINATIM_EMAIL || "";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
    }

    // Call OSM Nominatim Search API (forward geocoding)
    const url = `${GEOCODE_SEARCH_URL}?format=jsonv2&q=${encodeURIComponent(query)}&limit=5${NOMINATIM_EMAIL ? `&email=${encodeURIComponent(NOMINATIM_EMAIL)}` : ""}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "CommuteIntelligenceEngine/1.0 (contact@commute.local)",
        "Accept-Language": "en",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Geocoding service unavailable" }, { status: 503 });
    }

    const data = await res.json();

    if (!data || data.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Format results
    const results = data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      label: item.display_name,
      type: item.type,
      importance: item.importance,
    }));

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Forward geocoding error:", error);
    return NextResponse.json({ error: "Internal geocoding error" }, { status: 500 });
  }
}
