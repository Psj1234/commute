import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/app/lib/prisma";
import { computeRCI, bucketTime, inferPersona } from "@/app/lib/intelligence-engine";
import { calculateEnhancedRCI, compareRoutesForReliability } from "@/app/lib/enhanced-rci";
import { getActiveOSINTZones } from "@/app/lib/osint-data";



// Use OSRM (OpenStreetMap routing) for route alternatives
const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving";

async function fetchRoutesFromOSRM(start: { lat: number; lng: number }, end: { lat: number; lng: number }) {
  // Validate coordinates
  if (!start || !end || typeof start.lat !== "number" || typeof start.lng !== "number" || 
      typeof end.lat !== "number" || typeof end.lng !== "number") {
    throw new Error(`Invalid coordinates: start=${JSON.stringify(start)}, end=${JSON.stringify(end)}`);
  }
  
  if (Math.abs(start.lat) > 90 || Math.abs(start.lng) > 180 || 
      Math.abs(end.lat) > 90 || Math.abs(end.lng) > 180) {
    throw new Error(`Coordinates out of range: start=(${start.lat},${start.lng}), end=(${end.lat},${end.lng})`);
  }
  
  // OSRM expects lng,lat
  const coords = `${start.lng},${start.lat};${end.lng},${end.lat}`;
  const params = new URLSearchParams({
    alternatives: "true",
    overview: "full",
    geometries: "polyline6",
    steps: "true",
  });
  const url = `${OSRM_BASE_URL}/${coords}?${params.toString()}`;
  
  console.log("OSRM request URL:", url);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(`OSRM HTTP ${res.status}: ${errorText || res.statusText}`);
    }
    
    const data = await res.json();
    if (!data.routes) {
      throw new Error("No routes in OSRM response");
    }
    return data.routes;
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("OSRM request timeout (10s)");
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    let { start, end, userId } = await req.json();
    if (!start || !end) return NextResponse.json({ error: "Missing start/end" }, { status: 400 });

    // Validate and fix coordinates
    const isValidCoord = (coord: any) => 
      coord && typeof coord.lat === "number" && typeof coord.lng === "number" &&
      Math.abs(coord.lat) <= 90 && Math.abs(coord.lng) <= 180;
    
    if (!isValidCoord(start) || !isValidCoord(end)) {
      console.warn("Invalid coordinates received, using defaults:", { start, end });
      // Use default NYC coordinates as fallback
      start = { lat: 40.7128, lng: -74.006 };
      end = { lat: 40.6892, lng: -74.0445 };
    }

    // Get current time and user persona
    const currentTime = new Date();
    const timeWindow = bucketTime(currentTime);
    const userPersona = inferPersona(userId || "default_user").persona;
    
    // Get OSINT zones for penalty calculation
    const osintZones = getActiveOSINTZones(timeWindow);

    // 1. Fetch routes from OSRM (OSM)
    let mapsRoutes;
    try {
      mapsRoutes = await fetchRoutesFromOSRM(start, end);
    } catch (err: any) {
      console.error("OSRM fetch error:", err);
      return NextResponse.json({ error: "Routing API error: " + (err?.message || err) }, { status: 502 });
    }
    if (!mapsRoutes.length) return NextResponse.json({ error: "No routes found from routing API" }, { status: 404 });

    // 2. For each route, extract and store
    const routes = [];
    const routeRCIResults: any[] = [];
    let mapsPreferredRouteId = null;
    
    for (let i = 0; i < mapsRoutes.length; i++) {
      const route = mapsRoutes[i];
      try {
        const route_id = uuidv4();
        const geometry = route.geometry || "";
        const distance = route.distance ? route.distance / 1000 : 0; // km
        const duration = route.duration || 0; // seconds
        const durationMinutes = Math.round(duration / 60);
        const duration_in_traffic = duration; // OSRM does not provide traffic ETA
        const is_maps_preferred = i === 0;
        if (is_maps_preferred) mapsPreferredRouteId = route_id;

        // NEW: Extract turn-by-turn navigation steps from OSRM
        const navigationSteps = route.legs?.[0]?.steps?.map((step: any, idx: number) => ({
          step_number: idx + 1,
          instruction: step.maneuver?.type || "continue",
          modifier: step.maneuver?.modifier || "",
          distance: step.distance || 0, // meters
          duration: step.duration || 0, // seconds
          name: step.name || "unnamed road",
          mode: step.mode || "driving",
        })) || [];

        // NEW: Calculate Enhanced RCI with failure history and time-window patterns
        const enhancedRCI = calculateEnhancedRCI(
          start.lat,
          start.lng,
          end.lat,
          end.lng,
          durationMinutes,
          distance,
          currentTime,
          userPersona,
          osintZones
        );

        // Store in DB
        await prisma.route.create({
          data: {
            id: route_id,
            name: route.summary || `Route ${i + 1}`,
            start_lat: start.lat,
            start_lng: start.lng,
            end_lat: end.lat,
            end_lng: end.lng,
            distance,
            base_eta: durationMinutes,
            geometry,
          },
        });

        // Store RCI details
        await prisma.routeConfidence.create({
          data: {
            route_id,
            time_window: timeWindow,
            on_time_prob: enhancedRCI.components.on_time_prob,
            transfer_success: enhancedRCI.components.transfer_success,
            crowd_stability: enhancedRCI.components.crowd_stability,
            delay_variance: enhancedRCI.components.delay_variance,
            last_mile_avail: enhancedRCI.components.last_mile_avail,
            rci_score: enhancedRCI.rci,
          },
        });

        routeRCIResults.push({
          route_id,
          enhancedRCI,
          duration: durationMinutes,
        });

        routes.push({
          route_id,
          geometry,
          distance,
          duration,
          duration_in_traffic,
          is_maps_preferred,
          rci: enhancedRCI.rci,
          original_rci: enhancedRCI.original_rci,
          confidence_level: enhancedRCI.confidence_level,
          explanation: enhancedRCI.explanation,
          risk_factors: enhancedRCI.risk_factors,
          failure_penalty: enhancedRCI.failure_penalty,
          time_window_penalty: enhancedRCI.time_window_penalty,
          osint_penalty: enhancedRCI.osint_penalty,
          persona_bonus: enhancedRCI.persona_bonus,
          steps: navigationSteps, // Include navigation steps
        });
      } catch (routeErr: any) {
        console.error("Route processing error:", routeErr);
      }
    }

    // NEW: Compare routes and provide recommendation
    let routeComparison = "";
    if (routeRCIResults.length >= 2) {
      routeComparison = compareRoutesForReliability(
        routeRCIResults[0].enhancedRCI,
        routeRCIResults[0].duration,
        routeRCIResults[1].enhancedRCI,
        routeRCIResults[1].duration
      );
    }

    // NEW: Sort routes by RCI (highest first) instead of ETA
    routes.sort((a, b) => b.rci - a.rci);
    
    // Update preferred route to the highest RCI route
    const rciPreferredRouteId = routes[0]?.route_id;

    return NextResponse.json({ 
      routes, 
      maps_preferred_route_id: mapsPreferredRouteId,
      rci_preferred_route_id: rciPreferredRouteId,
      route_comparison: routeComparison,
      time_window: timeWindow,
      user_persona: userPersona,
    });
  } catch (error: any) {
    console.error("/api/routes/generate error:", error);
    return NextResponse.json({ error: "Internal error: " + (error?.message || error) }, { status: 500 });
  }
}
