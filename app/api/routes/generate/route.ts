import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/app/lib/prisma";
import { computeRCI, bucketTime, inferPersona } from "@/app/lib/intelligence-engine";
import { 
  calculateEnhancedRCI, 
  compareRoutesForReliability,
  rankRoutesByPersona,
  type CommutePersona
} from "@/app/lib/enhanced-rci";
import { generateMultiModalRoutes, formatRouteMode } from "@/app/lib/multimodal-routes";
import { generateTransitRoutes } from "@/app/lib/transit-routes";
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
    let { start, end, userId, persona } = await req.json();
    if (!start || !end) return NextResponse.json({ error: "Missing start/end" }, { status: 400 });

    // Validate persona (optional, defaults to SAFE_PLANNER)
    const validPersonas: CommutePersona[] = ["RUSHER", "SAFE_PLANNER", "COMFORT_SEEKER", "EXPLORER"];
    const selectedPersona: CommutePersona = validPersonas.includes(persona) ? persona : "SAFE_PLANNER";

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

    // NEW: Generate multi-modal routes (ADDITIVE - doesn't affect single-mode routes)
    // Graceful fallback: if multi-modal generation fails, we simply continue with single-mode routes
    let allRoutes: any[] = routes;
    try {
      const multiModalRoutes = await generateMultiModalRoutes(
        start.lat,
        start.lng,
        end.lat,
        end.lng,
        currentTime,
        userPersona,
        osintZones,
        calculateEnhancedRCI
      );

      if (multiModalRoutes && multiModalRoutes.length > 0) {
        // Append multi-modal routes after single-mode routes
        allRoutes = [
          ...routes,
          ...multiModalRoutes.map(mmRoute => ({
            ...mmRoute,
            mode_type: "MULTI",
            route_mode_string: formatRouteMode("MULTI", mmRoute.legs),
          })) as any,
        ];
        console.log(`Generated ${multiModalRoutes.length} multi-modal routes alongside ${routes.length} single-mode routes`);
      }
    } catch (mmErr: any) {
      console.warn("Multi-modal route generation failed, continuing with single-mode routes only:", mmErr);
      // No-op: allRoutes remains the single-mode routes array
    }

    // NEW: Generate transit routes (TRAIN/METRO - ADDITIVE)
    // Graceful fallback: if transit generation fails, we continue without transit routes
    try {
      const transitRoutes = await generateTransitRoutes(
        start.lat,
        start.lng,
        end.lat,
        end.lng,
        currentTime,
        userPersona,
        osintZones,
        calculateEnhancedRCI
      );

      if (transitRoutes && transitRoutes.length > 0) {
        // Append transit routes after single-mode and multi-modal routes
        allRoutes = [
          ...allRoutes,
          ...transitRoutes.map(transitRoute => ({
            ...transitRoute,
            mode_type: "TRANSIT",
          })) as any,
        ];
        console.log(`Generated ${transitRoutes.length} transit routes alongside existing routes`);
      }
    } catch (transitErr: any) {
      console.warn("Transit route generation failed, continuing without transit routes:", transitErr);
      // No-op: allRoutes remains as-is (single-mode + multi-modal)
    }

    // Add mode_type to single-mode routes for consistency
    // Also normalize duration fields for persona ranking
    const allRoutesWithModeType = allRoutes.map((route: any) => {
      // Normalize duration fields for compatibility
      let normalizedRoute = { ...route };
      
      if (route.mode_type === "SINGLE") {
        // Single-mode routes already have duration in seconds
        normalizedRoute.duration = route.duration; // seconds (original)
        normalizedRoute.total_travel_time = route.duration / 60; // convert to minutes
        normalizedRoute.mode_type = "SINGLE";
        normalizedRoute.route_mode_string = "Car";
      } else if (route.mode_type === "MULTI") {
        // Multi-modal routes already have duration fields
        normalizedRoute.duration = normalizedRoute.total_travel_time * 60; // convert minutes to seconds for compatibility
        normalizedRoute.transfer_count = route.transfer_count || 0;
      } else if (route.mode_type === "TRANSIT") {
        // Transit routes: use total_travel_time (minutes) and convert to seconds
        normalizedRoute.duration = normalizedRoute.total_travel_time * 60; // convert minutes to seconds
        normalizedRoute.transfer_count = route.transfer_count || 0;
        normalizedRoute.wait_time = route.wait_time || 0; // Include wait time for transit
      }
      
      return normalizedRoute;
    });

    // NEW: Apply persona-based ranking (NON-DESTRUCTIVE)
    // If persona ranking fails, fallback to RCI-sorted routes
    let rankedRoutes = allRoutesWithModeType;
    let personaExplanation = "";
    
    try {
      const personaRanked = rankRoutesByPersona(allRoutesWithModeType, selectedPersona);
      if (personaRanked && personaRanked.length > 0) {
        // Extract routes in persona-preferred order
        rankedRoutes = personaRanked.map(scored => ({
          ...scored.route,
          persona_score: scored.persona_score,
          persona_explanation: scored.persona_explanation,
        }));
        personaExplanation = personaRanked[0].persona_explanation;
      } else {
        // Fallback: sort by RCI
        rankedRoutes.sort((a, b) => b.rci - a.rci);
      }
    } catch (personaError) {
      console.warn("Persona ranking failed, using RCI fallback:", personaError);
      // Fallback: sort by RCI (highest first)
      rankedRoutes.sort((a, b) => b.rci - a.rci);
    }
    
    // Update preferred route to persona's top choice (or highest RCI as fallback)
    const personaPreferredRouteId = rankedRoutes[0]?.route_id;

    // Count route types for debugging
    const singleModeCount = rankedRoutes.filter((r: any) => r.mode_type === "SINGLE").length;
    const multiModalCount = rankedRoutes.filter((r: any) => r.mode_type === "MULTI").length;

    return NextResponse.json({ 
      routes: rankedRoutes, 
      maps_preferred_route_id: mapsPreferredRouteId,
      rci_preferred_route_id: personaPreferredRouteId, // Now persona-aware
      route_comparison: routeComparison,
      persona_explanation: personaExplanation,
      selected_persona: selectedPersona,
      time_window: timeWindow,
      user_persona: userPersona,
      route_stats: {
        total_routes: rankedRoutes.length,
        single_mode_routes: singleModeCount,
        multi_modal_routes: multiModalCount,
      }
    });
  } catch (error: any) {
    console.error("/api/routes/generate error:", error);
    return NextResponse.json({ error: "Internal error: " + (error?.message || error) }, { status: 500 });
  }
}
