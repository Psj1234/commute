import { NextRequest, NextResponse } from "next/server";

// Use OSM Nominatim reverse geocoding (no API key required)
const GEOCODE_API_URL = "https://nominatim.openstreetmap.org/reverse";
const NOMINATIM_EMAIL = process.env.NOMINATIM_EMAIL || "";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) {
      return NextResponse.json({ error: "Missing lat or lng" }, { status: 400 });
    }

    // Call OSM Nominatim Reverse Geocoding API
    const url = `${GEOCODE_API_URL}?format=jsonv2&lat=${lat}&lon=${lng}${NOMINATIM_EMAIL ? `&email=${encodeURIComponent(NOMINATIM_EMAIL)}` : ""}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "CommuteIntelligenceEngine/1.0 (contact@commute.local)",
        "Accept-Language": "en",
      },
    });

    if (!res.ok) {
      return NextResponse.json({
        label: `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
      });
    }

    const data = await res.json();

    if (!data || data.error) {
      return NextResponse.json({
        label: `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
      });
    }

    const address = data.address || {};
    const area = address.suburb || address.neighbourhood || address.quarter || "";
    const locality = address.city || address.town || address.village || address.hamlet || "";
    const state = address.state || "";

    let label = data.display_name || `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;

    if (area && locality) {
      label = `${area}, ${locality}`;
    } else if (locality && state) {
      label = `${locality}, ${state}`;
    } else if (locality) {
      label = locality;
    }

    return NextResponse.json({
      label,
      formatted_address: data.display_name,
    });
  } catch (error: any) {
    console.error("Geocoding error:", error);
    // Fallback to coordinates on error
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    return NextResponse.json({
      label: `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
    });
  }
}
