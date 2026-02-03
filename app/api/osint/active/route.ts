import { NextRequest, NextResponse } from "next/server";
import { getActiveOSINTZones, calculateDecayedSeverity } from "@/app/lib/osint-data";

export async function GET(request: NextRequest) {
  try {
    const zones = getActiveOSINTZones();

    const enrichedZones = zones.map((zone) => {
      const decayedSeverity = calculateDecayedSeverity(zone);
      return {
        zone_id: zone.id,
        type: zone.zone_type,
        severity: decayedSeverity,
        center_lat: zone.center_lat,
        center_lng: zone.center_lng,
        radius_km: zone.radius_km,
        geometry: zone.geometry,
        time_window_start: zone.time_window_start,
        time_window_end: zone.time_window_end,
        decay_factor: zone.decay_factor,
      };
    });

    return NextResponse.json({
      active_zones: enrichedZones,
      total_active: enrichedZones.length,
      max_severity: enrichedZones.length > 0 ? Math.max(...enrichedZones.map((z) => z.severity)) : 0,
    });
  } catch (error) {
    console.error("Error fetching active OSINT zones:", error);
    return NextResponse.json({ error: "Failed to fetch active zones" }, { status: 500 });
  }
}
