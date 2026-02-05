/**
 * Transit Routes Generator
 * 
 * Generates local train and metro route options for multi-modal integration.
 * Simulates transit stations/stops and route combinations with realistic timing.
 */

import { v4 as uuidv4 } from "uuid";
import type { Route, RCI_WEIGHTS_TYPE, CommutePersona } from "./types";
import type { RCIComponents } from "./intelligence-engine";

interface TransitHub {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "TRAIN_STATION" | "METRO_STOP";
  modes: ("TRAIN" | "METRO")[];
  wait_time_seconds: number; // Average wait time
}

interface TransitLeg {
  id: string;
  mode: "TRAIN" | "METRO";
  start_station: string;
  end_station: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  travel_time_minutes: number;
  wait_time_minutes: number;
  distance_km: number;
  crowd_score: number; // 0-1 (crowdedness during commute)
  line_name: string;
  stop_count: number;
}

/**
 * Calculate distance between two coordinates in kilometers
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate location-aware station names based on coordinates
 * Returns realistic names for known cities or area-based names for others
 */
function generateLocationAwareNames(baseLocation: string, count: number): string[] {
  const names: string[] = [];
  
  // Generate city-specific station names for major cities
  const cityNames: { [key: string]: string[] } = {
    // Mumbai, India
    "mumbai": [
      "Bandra Terminus", "Dadar Junction", "Mahim Station", "Fort Central",
      "Colaba Depot", "Worli Hub", "Lower Parel", "Thane East",
      "Borivali North", "Churchgate", "CST Central", "Mumbai Central",
      "Powai Interchange", "Goregaon West", "Malad East", "Andheri Station",
      "Navi Mumbai Junction", "Vile Parle", "Matunga Road", "Parel Station"
    ],
    // New York
    "new_york": [
      "Penn Station", "Grand Central", "Union Square", "Herald Square",
      "34th Street", "Times Square", "42nd Street", "Port Authority",
      "Brooklyn Bridge", "Canal Street", "Cortlandt", "Liberty",
      "Chambers St", "Spring St", "Prince St", "Park Ave"
    ],
    // Default/Generic
    "default": [
      "Central Hub", "North Station", "South Terminal", "East Plaza",
      "West Junction", "Downtown Core", "Uptown Link", "Midtown Hub",
      "Express Station", "Local Stop", "Transit Center", "Platform A",
      "Main Terminal", "Depot Station", "Crossing", "Exchange Point"
    ]
  };

  // Detect city based on coordinates
  let selectedNames = cityNames["default"];
  
  // Mumbai: ~19.07°N, 72.88°E
  if (baseLocation.toLowerCase().includes("mumbai")) {
    selectedNames = cityNames["mumbai"];
  }
  // New York: ~40.71°N, -74.00°W  
  else if (baseLocation.toLowerCase().includes("new_york") || baseLocation.toLowerCase().includes("new york")) {
    selectedNames = cityNames["new_york"];
  }

  // Generate unique names by cycling through and adding ordinals
  for (let i = 0; i < count; i++) {
    const baseName = selectedNames[i % selectedNames.length];
    // Add suffix to avoid duplicates within the same generation
    const suffix = i >= selectedNames.length ? ` (${Math.floor(i / selectedNames.length) + 1})` : "";
    names.push(baseName + suffix);
  }

  return names;
}

/**
 * Generate simulated transit hubs near a coordinate
 * Simulates real-world transit infrastructure with multiple stop/station options
 */
export function generateTransitHubs(lat: number, lng: number, radius_km: number = 2.5): TransitHub[] {
  const hubs: TransitHub[] = [];
  const stations_per_km = 0.8; // Density of transit stations in urban areas
  const hub_count = Math.max(3, Math.ceil(radius_km * stations_per_km)); // Ensure at least 3 hubs

  // Detect city based on coordinates
  let cityKey = "default";
  if (Math.abs(lat - 19.07) < 1 && Math.abs(lng - 72.88) < 1) {
    cityKey = "mumbai";
  } else if (Math.abs(lat - 40.71) < 1 && Math.abs(lng + 74.00) < 1) {
    cityKey = "new_york";
  }

  // Generate location-aware names
  const stationNames = generateLocationAwareNames(cityKey, hub_count);

  for (let i = 0; i < hub_count; i++) {
    // Random angle and distance from center point (biased toward closer hubs)
    const angle = Math.random() * 2 * Math.PI;
    const max_distance = Math.sqrt(Math.random()) * radius_km; // Bias closer
    const dlat = (max_distance / 111) * Math.cos(angle); // 111 km per degree latitude
    const dlng = (max_distance / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);

    const hub_lat = lat + dlat;
    const hub_lng = lng + dlng;

    // Alternate between METRO_STOP and TRAIN_STATION (3:1 ratio - more metro)
    const hub_type = i % 4 === 0 ? "TRAIN_STATION" : "METRO_STOP";

    const hub: TransitHub = {
      id: uuidv4(),
      name: stationNames[i],
      lat: hub_lat,
      lng: hub_lng,
      type: hub_type,
      modes: hub_type === "TRAIN_STATION" ? ["TRAIN"] : ["METRO"],
      wait_time_seconds: hub_type === "TRAIN_STATION" ? 
        Math.floor(Math.random() * (720 - 300) + 300) : // Trains: 5-12 min wait
        Math.floor(Math.random() * (480 - 120) + 120),    // Metro: 2-8 min wait
    };

    hubs.push(hub);
  }

  return hubs;
}

/**
 * Find nearest transit hub to a coordinate
 */
export function findNearestHub(lat: number, lng: number, hubs: TransitHub[]): TransitHub | null {
  if (hubs.length === 0) return null;
  
  let nearest = hubs[0];
  let minDistance = haversineDistance(lat, lng, hubs[0].lat, hubs[0].lng);

  for (let i = 1; i < hubs.length; i++) {
    const distance = haversineDistance(lat, lng, hubs[i].lat, hubs[i].lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = hubs[i];
    }
  }

  return minDistance <= 2 ? nearest : null; // Only return if within 2 km
}

/**
 * Generate a transit leg between two stations/stops
 */
export function createTransitLeg(
  from_station: TransitHub,
  to_station: TransitHub,
  mode: "TRAIN" | "METRO"
): TransitLeg {
  const distance = haversineDistance(
    from_station.lat,
    from_station.lng,
    to_station.lat,
    to_station.lng
  );

  // Transit speed varies by mode (trains faster, metros medium)
  const speed_kmh = mode === "TRAIN" ? 80 : 40;
  const travel_time_minutes = Math.ceil((distance / speed_kmh) * 60);

  // Crowd score varies by time of day and mode
  const base_crowd = mode === "TRAIN" ? 0.5 : 0.65; // Metros generally more crowded
  const crowd_variation = Math.random() * 0.3 - 0.15; // ±0.15 variation
  const crowd_score = Math.max(0, Math.min(1, base_crowd + crowd_variation));

  // Stop count: trains typically have fewer, longer stops; metros have many
  const stop_count = mode === "TRAIN" 
    ? Math.floor(distance / 10) + 2 
    : Math.floor(distance / 1.5) + 3;

  const leg_lines = [
    "Red Line", "Blue Line", "Green Line", "Yellow Line", "Purple Line",
    "Central Express", "Downtown Local", "Airport Link", "Circle Local"
  ];

  return {
    id: uuidv4(),
    mode,
    start_station: from_station.name,
    end_station: to_station.name,
    start_lat: from_station.lat,
    start_lng: from_station.lng,
    end_lat: to_station.lat,
    end_lng: to_station.lng,
    travel_time_minutes,
    wait_time_minutes: Math.round(from_station.wait_time_seconds / 60),
    distance_km: distance,
    crowd_score,
    line_name: leg_lines[Math.floor(Math.random() * leg_lines.length)],
    stop_count,
  };
}

/**
 * Generate polyline geometry for a transit leg (simplified)
 */
export function generateTransitGeometry(leg: TransitLeg): string {
  // Create a simple interpolated path between start and end
  // In production, would use actual transit route geometries
  const steps = 10;
  const coords: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = leg.start_lat + (leg.end_lat - leg.start_lat) * t;
    const lng = leg.start_lng + (leg.end_lng - leg.start_lng) * t;
    
    // Add slight curvature to simulate real routes
    const curve = Math.sin(t * Math.PI) * 0.002;
    coords.push([lng + curve, lat]);
  }

  // Simple polyline encoding (not polyline6, but sufficient for visualization)
  return encodeSimplePolyline(coords);
}

/**
 * Simple polyline encoding (sufficient for transit visualization)
 */
function encodeSimplePolyline(coords: [number, number][]): string {
  let encoded = "";
  let prevLat = 0;
  let prevLng = 0;

  for (const [lng, lat] of coords) {
    const dlat = Math.round((lat - prevLat) * 1e5);
    const dlng = Math.round((lng - prevLng) * 1e5);

    encoded += encodeVarint(dlat) + encodeVarint(dlng);
    prevLat = lat;
    prevLng = lng;
  }

  return encoded;
}

/**
 * Encode a value using variable-length quantity
 */
function encodeVarint(value: number): string {
  value = value << 1;
  if (value < 0) value = ~value;

  let encoded = "";
  while (value >= 0x20) {
    encoded += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
    value >>= 5;
  }
  encoded += String.fromCharCode(value + 63);
  return encoded;
}

/**
 * Create a complete transit route with RCI calculation
 */
export async function createTransitRoute(
  legs: TransitLeg[],
  calculateEnhancedRCI: any,
  start_lat: number,
  start_lng: number,
  end_lat: number,
  end_lng: number,
  current_time: Date,
  user_persona: string,
  osint_zones: any[]
): Promise<any> {
  const route_id = uuidv4();

  // Calculate combined metrics
  const total_travel_time = legs.reduce((sum, leg) => sum + leg.travel_time_minutes, 0);
  const total_wait_time = legs.reduce((sum, leg) => sum + leg.wait_time_minutes, 0);
  const total_time = total_travel_time + total_wait_time;
  const total_distance = legs.reduce((sum, leg) => sum + leg.distance_km, 0);
  const transfer_count = legs.length - 1;

  // Generate combined geometry
  const geometries = legs.map(leg => generateTransitGeometry(leg));
  const geometry = geometries.join(","); // Concatenate leg geometries

  // Create weighted average crowd score
  const weighted_crowd_score = legs.length > 0
    ? legs.reduce((sum, leg, i) => sum + leg.crowd_score * (leg.travel_time_minutes / total_travel_time), 0)
    : 0.5;

  // Calculate transit-specific RCI (base + transfers)
  const base_rci = calculateEnhancedRCI(
    start_lat,
    start_lng,
    end_lat,
    end_lng,
    total_time,
    total_distance,
    current_time,
    user_persona,
    osint_zones,
    {
      transit_mode: true,
      crowd_stability: weighted_crowd_score,
      transfer_count,
    }
  );

  // Apply transfer penalty (-3% per transfer after RCI calculation)
  const transfer_penalty = transfer_count * 0.03;
  const transit_rci = Math.max(0, base_rci.rci - transfer_penalty);

  // Build components for display
  const components = {
    crowd_stability: weighted_crowd_score,
    transfer_success: Math.max(0.6, 1.0 - transfer_count * 0.15),
  };

  return {
    route_id,
    mode_type: "TRANSIT",
    geometry,
    distance: total_distance,
    duration: total_time * 60, // Convert to seconds for consistency
    total_travel_time, // minutes
    wait_time: total_wait_time, // minutes
    transfer_count,
    legs: legs.map(leg => ({
      mode: leg.mode,
      start_station: leg.start_station,
      end_station: leg.end_station,
      start_lat: leg.start_lat,
      start_lng: leg.start_lng,
      end_lat: leg.end_lat,
      end_lng: leg.end_lng,
      travel_time_minutes: leg.travel_time_minutes,
      wait_time_minutes: leg.wait_time_minutes,
      distance_km: leg.distance_km,
      crowd_score: leg.crowd_score,
      line_name: leg.line_name,
      stop_count: leg.stop_count,
    })),
    rci: transit_rci,
    original_rci: base_rci.rci,
    confidence_level: base_rci.confidence_level,
    explanation: base_rci.explanation,
    risk_factors: base_rci.risk_factors,
    failure_penalty: base_rci.failure_penalty,
    time_window_penalty: base_rci.time_window_penalty,
    osint_penalty: base_rci.osint_penalty,
    persona_bonus: base_rci.persona_bonus,
    components,
    route_mode_string: `${legs.map(l => l.mode === "TRAIN" ? "🚂 Train" : "🚇 Metro").join(" → ")}`,
  };
}

/**
 * Generate transit routes (TRAIN and METRO combinations)
 */
export async function generateTransitRoutes(
  start_lat: number,
  start_lng: number,
  end_lat: number,
  end_lng: number,
  current_time: Date,
  user_persona: string,
  osint_zones: any[],
  calculateEnhancedRCI: any
): Promise<any[]> {
  try {
    // Generate transit hubs near start and end points
    const start_hubs = generateTransitHubs(start_lat, start_lng, 2.5);
    const end_hubs = generateTransitHubs(end_lat, end_lng, 2.5);

    if (start_hubs.length === 0 || end_hubs.length === 0) {
      console.warn("Insufficient transit hubs generated");
      return [];
    }

    // Find nearest hubs to actual start/end coordinates
    const nearest_start = findNearestHub(start_lat, start_lng, start_hubs);
    const nearest_end = findNearestHub(end_lat, end_lng, end_hubs);

    if (!nearest_start || !nearest_end) {
      console.warn("No nearby transit hubs found");
      return [];
    }

    const transit_routes: any[] = [];

    // Get metro and train hubs (look for first of each type in sorted arrays)
    const start_metro_hubs = start_hubs.filter(h => h.modes.includes("METRO")).sort((a, b) => 
      haversineDistance(start_lat, start_lng, a.lat, a.lng) - 
      haversineDistance(start_lat, start_lng, b.lat, b.lng)
    );
    const start_train_hubs = start_hubs.filter(h => h.modes.includes("TRAIN")).sort((a, b) => 
      haversineDistance(start_lat, start_lng, a.lat, a.lng) - 
      haversineDistance(start_lat, start_lng, b.lat, b.lng)
    );
    const end_metro_hubs = end_hubs.filter(h => h.modes.includes("METRO")).sort((a, b) => 
      haversineDistance(end_lat, end_lng, a.lat, a.lng) - 
      haversineDistance(end_lat, end_lng, b.lat, b.lng)
    );
    const end_train_hubs = end_hubs.filter(h => h.modes.includes("TRAIN")).sort((a, b) => 
      haversineDistance(end_lat, end_lng, a.lat, a.lng) - 
      haversineDistance(end_lat, end_lng, b.lat, b.lng)
    );

    // Generate metro-only route if metro is available at both ends
    if (start_metro_hubs.length > 0 && end_metro_hubs.length > 0) {
      const metro_leg = createTransitLeg(start_metro_hubs[0], end_metro_hubs[0], "METRO");
      const metro_route = await createTransitRoute(
        [metro_leg],
        calculateEnhancedRCI,
        start_lat,
        start_lng,
        end_lat,
        end_lng,
        current_time,
        user_persona,
        osint_zones
      );
      transit_routes.push(metro_route);
    }

    // Generate train-only route if available, otherwise use metro+train hybrid
    if (start_train_hubs.length > 0 && end_train_hubs.length > 0) {
      const train_leg = createTransitLeg(start_train_hubs[0], end_train_hubs[0], "TRAIN");
      const train_route = await createTransitRoute(
        [train_leg],
        calculateEnhancedRCI,
        start_lat,
        start_lng,
        end_lat,
        end_lng,
        current_time,
        user_persona,
        osint_zones
      );
      transit_routes.push(train_route);
    }

    // Generate mixed routes (metro + train combinations) if both are available
    // Use the first train hub at start or first metro hub, and vice versa at end
    if (start_metro_hubs.length > 0 && end_train_hubs.length > 0 && 
        start_train_hubs.length > 0 && end_metro_hubs.length > 0) {
      
      // Option 1: Start with metro, end with train  
      const metro_to_hub = createTransitLeg(start_metro_hubs[0], end_metro_hubs[0], "METRO");
      const hub_to_train = createTransitLeg(start_train_hubs[0], end_train_hubs[0], "TRAIN");
      
      const combined_route = await createTransitRoute(
        [metro_to_hub, hub_to_train],
        calculateEnhancedRCI,
        start_lat,
        start_lng,
        end_lat,
        end_lng,
        current_time,
        user_persona,
        osint_zones
      );
      transit_routes.push(combined_route);
    }

    // If no routes generated yet, create at least a metro fallback using any available hubs
    if (transit_routes.length === 0 && start_hubs.length > 0 && end_hubs.length > 0) {
      const fallback_leg = createTransitLeg(start_hubs[0], end_hubs[0], "METRO");
      const fallback_route = await createTransitRoute(
        [fallback_leg],
        calculateEnhancedRCI,
        start_lat,
        start_lng,
        end_lat,
        end_lng,
        current_time,
        user_persona,
        osint_zones
      );
      transit_routes.push(fallback_route);
    }

    return transit_routes;
  } catch (err) {
    console.error("Transit route generation error:", err);
    return [];
  }
}

/**
 * Apply transit-specific persona adjustments
 */
export function applyTransitPersonaBonus(
  base_rci: number,
  persona: CommutePersona,
  transfer_count: number,
  crowd_score: number,
  wait_time_minutes: number
): { adjusted_rci: number; bonus_percent: number } {
  let bonus = 0;

  switch (persona) {
    case "RUSHER":
      // Rushers like express trains (fewer stops) but dislike waiting
      bonus -= wait_time_minutes * 0.5; // -0.5% per minute wait
      if (transfer_count === 1) bonus += 5; // +5% bonus for direct transit
      if (transfer_count > 1) bonus -= transfer_count * 3;
      break;

    case "SAFE_PLANNER":
      // Safe planners value reliability but avoid crowded peak times
      bonus += 3; // Base +3% for transit reliability
      if (crowd_score > 0.75) bonus -= 8; // Penalize crowded metro during peak
      bonus -= transfer_count * 2;
      break;

    case "COMFORT_SEEKER":
      // Comfort seekers prefer less crowded metro with fewer transfers
      if (crowd_score < 0.5) bonus += 4; // Reward uncrowded times
      if (crowd_score > 0.8) bonus -= 10; // Heavy penalty for crowded metro
      bonus -= transfer_count * 4;
      break;

    case "EXPLORER":
      // Explorers enjoy transit variety and new routes
      bonus += 6; // Base +6% for transit exploration
      bonus += transfer_count * 1; // +1% per transfer (enjoy variety)
      bonus += 2; // Small bonus for metro/train experimentation
      break;
  }

  const bonus_percent = bonus;
  const adjusted_rci = Math.min(1, Math.max(0, base_rci + bonus_percent / 100));

  return { adjusted_rci, bonus_percent };
}
