import { NextRequest, NextResponse } from "next/server";
import { SAMPLE_ROUTES } from "@/app/lib/simulated-data";
import { generateSimulatedRCI, generateSimulatedFailureScore, generateSimulatedCrowdLevel } from "@/app/lib/simulated-data";
import { bucketTime, applyOSINTScoring } from "@/app/lib/intelligence-engine";
import { getActiveOSINTZones } from "@/app/lib/osint-data";

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const timeWindow = bucketTime(now);
    
    // Get active OSINT zones for scoring
    const osintZones = getActiveOSINTZones();

    // Enhance routes with intelligence scores
    const enhancedRoutes = SAMPLE_ROUTES.map((route) => {
      const rciScore = generateSimulatedRCI(route.id, timeWindow);
      
      // Apply OSINT soft penalty
      const { adjustedRCI, osintPenalty, affectedZones } = applyOSINTScoring(
        rciScore,
        route.start_lat,
        route.start_lng,
        route.end_lat,
        route.end_lng,
        osintZones
      );

      return {
        ...route,
        rciScore: adjustedRCI,
        originalRCI: rciScore,
        osintPenalty,
        osintAffectedZones: affectedZones.map((z) => ({
          id: z.id,
          type: z.zone_type,
          severity: z.severity,
        })),
        failureScore: generateSimulatedFailureScore("downtown", timeWindow),
        crowdLevel: generateSimulatedCrowdLevel(route.id, timeWindow),
        timeWindow,
      };
    });

    // Sort by adjusted RCI (highest first)
    enhancedRoutes.sort((a, b) => b.rciScore - a.rciScore);

    return NextResponse.json({
      routes: enhancedRoutes,
      recommendedRoute: enhancedRoutes[0],
      timeWindow,
      activeOSINTZones: osintZones.length,
    });
  } catch (error) {
    console.error("Error fetching routes:", error);
    return NextResponse.json({ error: "Failed to fetch routes" }, { status: 500 });
  }
}
