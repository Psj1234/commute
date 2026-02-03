import { NextRequest, NextResponse } from "next/server";
import { getActiveOSINTZones, calculateDecayedSeverity } from "@/app/lib/osint-data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeWindow = searchParams.get("time_window");

    const zones = getActiveOSINTZones(timeWindow || undefined);

    const enrichedZones = zones.map((zone) => ({
      ...zone,
      decayed_severity: calculateDecayedSeverity(zone),
    }));

    return NextResponse.json({
      zones: enrichedZones,
      count: enrichedZones.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching OSINT zones:", error);
    return NextResponse.json({ error: "Failed to fetch OSINT zones" }, { status: 500 });
  }
}
