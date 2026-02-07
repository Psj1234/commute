import { NextRequest, NextResponse } from "next/server";
import {
  getMumbaiDemoRoute,
  getTrafficForTime,
  calculateRouteMetrics,
  getAndheriToCSTPRoutes,
} from "@/app/lib/traffic-intelligence";
import { rankRoutesByPersona, getDefaultPersona, type PersonaType } from "@/app/lib/persona-traffic-ranker";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const personaParam = searchParams.get("persona") as PersonaType | null;
    const timeParam = searchParams.get("time") || "09:30"; // Default to demo time
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const routeIdParam = searchParams.get("routeId"); // Optional filter to single route

    // Use provided persona or default to Safe Planner
    const persona = personaParam && ["RUSHER", "SAFE_PLANNER", "COMFORT_SEEKER", "EXPLORER"].includes(personaParam)
      ? personaParam
      : getDefaultPersona();

    // Get routes based on start/end parameters
    let baseRoutes: any[] = [];

    if (startParam === "Andheri" && endParam === "CST") {
      // Multi-route scenario: Andheri → CST
      baseRoutes = getAndheriToCSTPRoutes();
    } else {
      // Default: Single demo route (Bandra → CST)
      baseRoutes = [getMumbaiDemoRoute()];
    }

    // Apply time-based traffic adjustments to all routes
    const routesWithTraffic = baseRoutes.map((route) =>
      getTrafficForTime(route, timeParam)
    );

    // If specific route requested, return that route's details
    if (routeIdParam) {
      const selectedRoute = routesWithTraffic.find((r) => r.id === routeIdParam);
      if (selectedRoute) {
        const metrics = calculateRouteMetrics(selectedRoute);
        return NextResponse.json({
          route: selectedRoute,
          metrics,
          persona,
          time: timeParam,
        });
      }
    }

    // Rank routes by persona
    const rankedRoutes = rankRoutesByPersona(routesWithTraffic, persona);

    // Format response
    const response = rankedRoutes.map((ranked, idx) => ({
      id: ranked.route.id,
      name: ranked.route.name,
      origin: ranked.route.origin,
      destination: ranked.route.destination,
      persona_score: Math.round(ranked.personaScore * 100) / 100,
      rank: idx + 1,
      explanation: ranked.explanation,
      segments: ranked.route.segments.map((seg) => {
        const metrics = {
          distance_km: seg.distance_km,
          base_eta_min: seg.base_eta_min,
          traffic_density: Math.round(seg.traffic_density * 100) / 100,
          crowd_score: Math.round(seg.crowd_score * 100) / 100,
          incident_rate: Math.round(seg.incident_rate * 100) / 100,
        };
        return {
          id: seg.id,
          name: seg.name,
          mode: seg.mode,
          start: { lat: seg.start_lat, lng: seg.start_lng },
          end: { lat: seg.end_lat, lng: seg.end_lng },
          ...metrics,
        };
      }),
      segment_explanations: ranked.segmentExplanations,
      total_distance_km: ranked.route.total_distance_km,
      total_base_eta_min: ranked.route.total_base_eta_min,
      departure_time: ranked.route.departure_time,
    }));

    return NextResponse.json({
      persona,
      time: timeParam,
      start: startParam || "Bandra",
      end: endParam || "CST",
      routes: response,
      recommended_route: response[0] || null,
      total_routes: response.length,
      message: `Ranked ${response.length} route(s) for ${persona} at ${timeParam}${
        startParam && endParam ? ` (${startParam} → ${endParam})` : ""
      }`,
    });
  } catch (error) {
    console.error("Error fetching personalized routes:", error);
    return NextResponse.json(
      { error: "Failed to fetch personalized routes" },
      { status: 500 }
    );
  }
}
