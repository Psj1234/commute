import { NextRequest, NextResponse } from "next/server";
import { SAMPLE_ALERT_ZONES } from "@/app/lib/simulated-data";
import { isInAlertZone } from "@/app/lib/intelligence-engine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    // Return all zones or filter by proximity if coordinates provided
    if (!lat || !lng) {
      return NextResponse.json({
        zones: SAMPLE_ALERT_ZONES,
        nearbyCount: 0,
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    // Find nearby zones
    const nearbyZones = SAMPLE_ALERT_ZONES.filter((zone) =>
      isInAlertZone(latitude, longitude, zone.centerLat, zone.centerLng, zone.radiusKm)
    );

    return NextResponse.json({
      zones: SAMPLE_ALERT_ZONES,
      nearbyZones,
      nearbyCount: nearbyZones.length,
    });
  } catch (error) {
    console.error("Error fetching alert zones:", error);
    return NextResponse.json({ error: "Failed to fetch alert zones" }, { status: 500 });
  }
}
