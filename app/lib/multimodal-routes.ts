/**
 * MULTI-MODAL ROUTING SERVICE
 * 
 * Generates multi-modal route combinations (e.g., Car+Train, Train+Flight)
 * alongside existing single-mode routes.
 * 
 * NON-BREAKING: This is purely additive. Single-mode routes are unaffected.
 * FALLBACK SAFE: If multi-modal generation fails, system returns only single-mode routes.
 */

import { v4 as uuidv4 } from "uuid";
import { RouteLeg, MultiModalRoute, TransportMode } from "./types";
import { calculateEnhancedRCI, type CommutePersona } from "./enhanced-rci";

interface TransitHub {
  name: string;
  lat: number;
  lng: number;
  type: "TRAIN_STATION" | "AIRPORT" | "BUS_STATION";
}

// Simulated transit hubs (in real system, query actual transit DB)
const TRANSIT_HUBS: TransitHub[] = [
  { name: "Penn Station", lat: 40.7505, lng: -73.9972, type: "TRAIN_STATION" },
  { name: "Grand Central", lat: 40.7527, lng: -73.9772, type: "TRAIN_STATION" },
  { name: "LaGuardia", lat: 40.7769, lng: -73.8740, type: "AIRPORT" },
  { name: "JFK", lat: 40.6413, lng: -73.7781, type: "AIRPORT" },
  { name: "Newark Airport", lat: 40.6895, lng: -74.1745, type: "AIRPORT" },
  { name: "Port Authority", lat: 40.7562, lng: -73.9897, type: "BUS_STATION" },
];

// Find nearest transit hub
function findNearestHub(lat: number, lng: number, type?: string): TransitHub | null {
  let nearest = null;
  let minDist = Infinity;

  for (const hub of TRANSIT_HUBS) {
    if (type && hub.type !== type) continue;
    const dist = Math.hypot(hub.lat - lat, hub.lng - lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = hub;
    }
  }

  return minDist < 50 ? nearest : null; // Within 50 miles (rough approximation)
}

// Haversine distance in km
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Estimated travel time: distance / average speed
function estimateTravelTime(
  distKm: number,
  mode: TransportMode
): { travel_time: number; wait_time: number } {
  const avgSpeeds: Record<TransportMode, number> = {
    CAR: 50, // km/h in urban area
    TRAIN: 80, // km/h average with stops
    FLIGHT: 900, // km/h (but mostly for long distances)
    WALK: 5, // km/h
  };

  const speed = avgSpeeds[mode];
  const travelMinutes = Math.round((distKm / speed) * 60);

  // Wait times (simulated)
  const waitTimes: Record<TransportMode, number> = {
    CAR: 0,
    TRAIN: 5 + Math.random() * 10, // 5-15 min
    FLIGHT: 90 + Math.random() * 60, // 90-150 min (check-in, boarding)
    WALK: 0,
  };

  return {
    travel_time: travelMinutes,
    wait_time: Math.round(waitTimes[mode]),
  };
}

// Simulated crowd score for leg (0-1)
function estimateCrowdScore(mode: TransportMode): number {
  const baseCrowds: Record<TransportMode, number> = {
    CAR: 0.5,
    TRAIN: 0.7,
    FLIGHT: 0.3,
    WALK: 0.2,
  };
  return baseCrowds[mode] + (Math.random() * 0.2 - 0.1); // ±0.1 variance
}

// Create a single leg
function createLeg(
  mode: TransportMode,
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): RouteLeg {
  const distKm = distanceKm(startLat, startLng, endLat, endLng);
  const { travel_time, wait_time } = estimateTravelTime(distKm, mode);
  const crowdScore = estimateCrowdScore(mode);

  return {
    leg_id: uuidv4(),
    mode,
    start_lat: startLat,
    start_lng: startLng,
    end_lat: endLat,
    end_lng: endLng,
    travel_time_minutes: travel_time,
    wait_time_minutes: wait_time,
    crowd_score: crowdScore,
    distance_km: distKm,
    geometry: "", // Would be populated from actual routing API
    transfer_time_minutes: 10, // Standard transfer time
  };
}

// Check if route is feasible (basic validation)
function validateRoute(legs: RouteLeg[]): boolean {
  if (!legs || legs.length === 0) return false;

  // Ensure total travel time is reasonable
  const totalTime = legs.reduce((sum, leg) => sum + leg.travel_time_minutes + leg.wait_time_minutes, 0);
  if (totalTime > 360) return false; // > 6 hours seems unrealistic

  // Ensure no negative times
  for (const leg of legs) {
    if (leg.travel_time_minutes < 0 || leg.wait_time_minutes < 0) return false;
  }

  return true;
}

/**
 * Generate multi-modal route combinations
 * 
 * Generates:
 * - Car + Train + Walk
 * - Train + Flight + Car
 * - Car + Train + Flight + Walk
 * - Train + Train (local to regional)
 * 
 * Each route is validated before inclusion.
 */
export async function generateMultiModalRoutes(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  currentTime: Date,
  userPersona: string | CommutePersona,
  osintZones: any[],
  enhancedRCICompute?: typeof calculateEnhancedRCI
): Promise<MultiModalRoute[]> {
  // Validate and cast persona
  const validPersonas: CommutePersona[] = ["RUSHER", "SAFE_PLANNER", "COMFORT_SEEKER", "EXPLORER"];
  const persona: CommutePersona = (validPersonas.includes(userPersona as CommutePersona) 
    ? userPersona 
    : "SAFE_PLANNER") as CommutePersona;
  const multiModalRoutes: MultiModalRoute[] = [];

  try {
    // Strategy 1: Car + Train
    // Start → Nearest Train Station (car) → Destination Hub (train) → End (walk)
    const trainStation = findNearestHub(startLat, startLng, "TRAIN_STATION");
    if (trainStation) {
      const destTrainStation = findNearestHub(endLat, endLng, "TRAIN_STATION");
      if (destTrainStation) {
        const legs: RouteLeg[] = [
          createLeg("CAR", startLat, startLng, trainStation.lat, trainStation.lng),
          createLeg("TRAIN", trainStation.lat, trainStation.lng, destTrainStation.lat, destTrainStation.lng),
          createLeg("WALK", destTrainStation.lat, destTrainStation.lng, endLat, endLng),
        ];

        if (validateRoute(legs)) {
          multiModalRoutes.push(createMultiModalRoute("Car + Train + Walk", legs, startLat, startLng, endLat, endLng, currentTime, persona, osintZones, enhancedRCICompute));
        }
      }
    }

    // Strategy 2: Train + Flight (only if long distance)
    // Start → Nearest Train Station → Airport (train) → Destination Airport (flight) → End (car)
    const startAirport = findNearestHub(startLat, startLng, "AIRPORT");
    const endAirport = findNearestHub(endLat, endLng, "AIRPORT");
    const dist = distanceKm(startLat, startLng, endLat, endLng);
    
    if (startAirport && endAirport && dist > 300) {
      // Only for long distances
      const legs: RouteLeg[] = [
        createLeg("CAR", startLat, startLng, startAirport.lat, startAirport.lng),
        createLeg("FLIGHT", startAirport.lat, startAirport.lng, endAirport.lat, endAirport.lng),
        createLeg("CAR", endAirport.lat, endAirport.lng, endLat, endLng),
      ];

      if (validateRoute(legs)) {
        multiModalRoutes.push(
          createMultiModalRoute(
            "Car + Flight + Car",
            legs,
            startLat,
            startLng,
            endLat,
            endLng,
            currentTime,
            persona,
            osintZones,
            enhancedRCICompute
          )
        );
      }
    }

    // Strategy 3: Train-only alternative routes
    // Start → Station1 (car) → Station2 (train) → End (walk)
    const altTrainStation = TRANSIT_HUBS.filter(h => h.type === "TRAIN_STATION" && h !== trainStation)[0];
    if (altTrainStation && trainStation) {
      const legs: RouteLeg[] = [
        createLeg("CAR", startLat, startLng, altTrainStation.lat, altTrainStation.lng),
        createLeg("TRAIN", altTrainStation.lat, altTrainStation.lng, trainStation.lat, trainStation.lng),
        createLeg("WALK", trainStation.lat, trainStation.lng, endLat, endLng),
      ];

      if (validateRoute(legs)) {
        multiModalRoutes.push(
          createMultiModalRoute(
            "Car + Train Alternative + Walk",
            legs,
            startLat,
            startLng,
            endLat,
            endLng,
            currentTime,
            persona,
            osintZones,
            enhancedRCICompute
          )
        );
      }
    }

    return multiModalRoutes;
  } catch (err: any) {
    console.error("Multi-modal route generation error:", err);
    // Graceful fallback: return empty array, system will use single-mode routes
    return [];
  }
}

/**
 * Helper: Create a multi-modal route object
 */
function createMultiModalRoute(
  name: string,
  legs: RouteLeg[],
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  currentTime: Date,
  userPersona: string,
  osintZones: any[],
  enhancedRCICompute?: typeof calculateEnhancedRCI
): MultiModalRoute {
  // Aggregate metrics
  const totalTravelTime = legs.reduce((sum, leg) => sum + leg.travel_time_minutes + leg.wait_time_minutes, 0);
  const totalDistance = legs.reduce((sum, leg) => sum + leg.distance_km, 0);
  const transferCount = legs.length - 1;

  // Average crowd score (weighted by leg duration for fairness)
  const totalLegTime = legs.reduce((sum, leg) => sum + leg.travel_time_minutes + leg.wait_time_minutes, 0);
  const avgCrowdScore = totalLegTime > 0 
    ? legs.reduce((sum, leg) => sum + leg.crowd_score * (leg.travel_time_minutes + leg.wait_time_minutes), 0) / totalLegTime
    : legs.reduce((sum, leg) => sum + leg.crowd_score, 0) / legs.length;

  // Transfer success score: high if few transfers, lower with more transfers
  // Base on 0.9 (excellent), degrade with transfers
  const transferSuccessScore = Math.max(0.5, 1.0 - (transferCount * 0.15)); // -15% per transfer, floor at 0.5

  // Compute RCI with aggregated metrics
  let rci = 0.5; // default safe value
  
  if (enhancedRCICompute) {
    try {
      const rciResult = enhancedRCICompute(
        startLat,
        startLng,
        endLat,
        endLng,
        totalTravelTime,
        totalDistance,
        currentTime,
        userPersona,
        osintZones
      );
      rci = rciResult.rci;
      
      // Apply transfer penalty (transfers inherently reduce reliability)
      // BUT only after considering them in the enhanced RCI computation
      // The penalty here is multiplicative, not additive
      const transferPenalty = 0.03 * transferCount; // -3% per transfer after all other factors
      rci = Math.max(0, Math.min(1, rci - transferPenalty));
    } catch (err) {
      console.warn("RCI computation failed for multi-modal route, using default:", err);
      // Still apply transfer penalty to the default value
      rci = Math.max(0.3, 0.5 - (0.03 * transferCount));
    }
  } else {
    // Fallback: simple calculation without enhanced RCI
    rci = Math.max(0.3, 0.7 - (0.1 * transferCount) - (0.1 * totalTravelTime / 120));
  }

  // Create synthetic combined geometry from leg coordinates
  // This allows the map to render multi-modal routes as a single polyline
  const combinedCoords: [number, number][] = [];
  legs.forEach((leg, idx) => {
    if (idx === 0) {
      // Add start point of first leg
      combinedCoords.push([leg.start_lat, leg.start_lng]);
    }
    // Add end point of this leg
    combinedCoords.push([leg.end_lat, leg.end_lng]);
  });

  // Convert coordinates to polyline6 format (or store as JSON for now)
  const geometry = JSON.stringify(combinedCoords);

  return {
    route_id: uuidv4(),
    mode_type: "MULTI",
    name,
    start_lat: startLat,
    start_lng: startLng,
    end_lat: endLat,
    end_lng: endLng,
    total_travel_time: Math.round(totalTravelTime),
    total_distance_km: Math.round(totalDistance * 10) / 10,
    transfer_count: transferCount,
    legs,
    geometry: geometry, // Combined geometry from all legs
    rci: rci,
    // Include components for persona compatibility
    components: {
      crowd_stability: avgCrowdScore,
      transfer_success: transferSuccessScore,
    },
  } as any;
}

/**
 * Format route modes as string (e.g., "Car + Train + Walk")
 */
export function formatRouteMode(modeType: string, legs?: any[]): string {
  if (modeType === "SINGLE") return "Single-Mode";
  if (!legs || legs.length === 0) return "Multi-Modal";

  return legs.map((leg) => {
    const modeNames: Record<TransportMode, string> = {
      CAR: "🚗",
      TRAIN: "🚆",
      FLIGHT: "✈️",
      WALK: "🚶",
    };
    return modeNames[leg.mode as TransportMode] || leg.mode;
  }).join(" → ");
}

/**
 * Get mode badge for display (text + icons)
 */
export function getModeLabel(mode: TransportMode): { icon: string; label: string } {
  const modes: Record<TransportMode, { icon: string; label: string }> = {
    CAR: { icon: "🚗", label: "Car" },
    TRAIN: { icon: "🚆", label: "Train" },
    FLIGHT: { icon: "✈️", label: "Flight" },
    WALK: { icon: "🚶", label: "Walk" },
  };
  return modes[mode];
}
