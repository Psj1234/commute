/**
 * Mock Traffic Intelligence System
 * Simulates real-time traffic patterns and crowd data for demo purposes
 */

export interface TrafficSegment {
  id: string;
  name: string;
  mode: "car" | "bus" | "train" | "metro" | "walk" | "bike" | "cab";
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  distance_km: number;
  base_eta_min: number;
  traffic_density: number; // 0-1 (0 = free flow, 1 = gridlock)
  crowd_score: number; // 0-1 (0 = empty, 1 = packed)
  incident_rate: number; // 0-1 (probability of delay/disruption)
}

export interface TrafficRoute {
  id: string;
  name: string;
  origin: string;
  destination: string;
  segments: TrafficSegment[];
  total_distance_km: number;
  total_base_eta_min: number;
  departure_time: string;
}

export type TrafficSignal = "🟥" | "🟨" | "🟩"; // Red, Yellow, Green

/**
 * Get traffic signal based on congestion level
 * Red: traffic_density > 0.7 or crowd_score > 0.7
 * Yellow: traffic_density 0.4-0.7 or crowd_score 0.4-0.7
 * Green: traffic_density < 0.4 and crowd_score < 0.4
 */
export function getTrafficSignal(traffic_density: number, crowd_score: number): TrafficSignal {
  const maxCongestion = Math.max(traffic_density, crowd_score);

  if (maxCongestion > 0.7) {
    return "🟥"; // Red - Heavy congestion/crowd
  } else if (maxCongestion > 0.4) {
    return "🟨"; // Yellow - Moderate flow
  } else {
    return "🟩"; // Green - Free flow
  }
}

/**
 * Get signal description
 */
export function getSignalDescription(signal: TrafficSignal): string {
  switch (signal) {
    case "🟥":
      return "Heavy congestion/crowd";
    case "🟨":
      return "Moderate flow";
    case "🟩":
      return "Free flow";
  }
}

/**
 * Calculate adjusted ETA based on traffic
 */
export function calculateAdjustedEta(
  base_eta_min: number,
  traffic_density: number,
  incident_rate: number
): number {
  // Traffic multiplier: 1.0 at 0 density, 2.5 at 1.0 density
  const trafficMultiplier = 1 + traffic_density * 1.5;

  // Incident delay: 0-20 minutes based on probability
  const incidentDelay = incident_rate * 20;

  return Math.round(base_eta_min * trafficMultiplier + incidentDelay);
}

/**
 * Get mode emoji
 */
export function getModeEmoji(mode: TrafficSegment["mode"]): string {
  const emojis: Record<TrafficSegment["mode"], string> = {
    car: "🚗",
    bus: "🚌",
    train: "🚆",
    metro: "🚇",
    walk: "🚶",
    bike: "🚴",
    cab: "🚕",
  };
  return emojis[mode];
}

/**
 * Mumbai Demo Route: Bandra → CST @ 9:30 AM
 * Real-world inspired segments with mock traffic data
 */
export function getMumbaiDemoRoute(): TrafficRoute {
  return {
    id: "mumbai-bandra-cst-0930",
    name: "Bandra → CST (9:30 AM)",
    origin: "Bandra, Mumbai",
    destination: "CST, Mumbai",
    departure_time: "09:30",
    total_distance_km: 24.5,
    total_base_eta_min: 85,
    segments: [
      {
        id: "seg-1",
        name: "Bandra → Andheri (Car)",
        mode: "car",
        start_lat: 19.062,
        start_lng: 72.8298,
        end_lat: 19.1136,
        end_lng: 72.8697,
        distance_km: 8.2,
        base_eta_min: 18,
        traffic_density: 0.91, // 🟥 Heavy - Western Express Road morning rush
        crowd_score: 0.15, // Empty cars
        incident_rate: 0.08, // Low incident risk
      },
      {
        id: "seg-2",
        name: "Andheri Station Parking & Entry",
        mode: "walk",
        start_lat: 19.1136,
        start_lng: 72.8697,
        end_lat: 19.1142,
        end_lng: 72.8685,
        distance_km: 0.15,
        base_eta_min: 3,
        traffic_density: 0.0,
        crowd_score: 0.65, // 🟨 Moderate - Station entrance crowd
        incident_rate: 0.02,
      },
      {
        id: "seg-3",
        name: "Andheri → Dadar (Central Line Train)",
        mode: "train",
        start_lat: 19.1142,
        start_lng: 72.8685,
        end_lat: 19.0176,
        end_lng: 72.8479,
        distance_km: 12.8,
        base_eta_min: 35,
        traffic_density: 0.0, // N/A for train
        crowd_score: 0.68, // 🟨 Moderate-High - Morning rush hour
        incident_rate: 0.06, // Minimal delays
      },
      {
        id: "seg-4",
        name: "Dadar → CST (Continuation Line)",
        mode: "metro",
        start_lat: 19.0176,
        end_lat: 18.9674,
        start_lng: 72.8479,
        end_lng: 72.8373,
        distance_km: 2.1,
        base_eta_min: 12,
        traffic_density: 0.0,
        crowd_score: 0.72, // 🟥 High - Peak hour metro
        incident_rate: 0.04,
      },
      {
        id: "seg-5",
        name: "CST Station Exit & Final Destination",
        mode: "walk",
        start_lat: 18.9674,
        start_lng: 72.8373,
        end_lat: 18.9665,
        end_lng: 72.8378,
        distance_km: 0.2,
        base_eta_min: 4,
        traffic_density: 0.0,
        crowd_score: 0.45, // 🟨 Moderate - Station exit area
        incident_rate: 0.01,
      },
    ],
  };
}

/**
 * Station coordinates for multi-route generation
 */
export const MUMBAI_STATIONS = {
  ANDHERI: { lat: 19.1197, lng: 72.8468, name: "Andheri", code: "ANDHERI" },
  BANDRA: { lat: 19.0544, lng: 72.8400, name: "Bandra", code: "BANDRA" },
  DADAR: { lat: 19.0176, lng: 72.8562, name: "Dadar", code: "DADAR" },
  CST: { lat: 18.9402, lng: 72.8356, name: "CST", code: "CST" },
};

/**
 * Route 1: Andheri → CST (Road Only - Car/Cab)
 */
function getAndheriCSTRoadRoute(): TrafficRoute {
  return {
    id: "andheri-cst-road",
    name: "🚗 Andheri → CST (Road)",
    origin: "Andheri, Mumbai",
    destination: "CST, Mumbai",
    departure_time: "09:30",
    total_distance_km: 18.5,
    total_base_eta_min: 45,
    segments: [
      {
        id: "seg-andheri-cst-road",
        name: "Andheri → CST (Car/Cab via Eastern Express Road)",
        mode: "car",
        start_lat: MUMBAI_STATIONS.ANDHERI.lat,
        start_lng: MUMBAI_STATIONS.ANDHERI.lng,
        end_lat: MUMBAI_STATIONS.CST.lat,
        end_lng: MUMBAI_STATIONS.CST.lng,
        distance_km: 18.5,
        base_eta_min: 45,
        traffic_density: 0.85, // 🟥 Heavy traffic on major road
        crowd_score: 0.1, // Low crowd (solo traveler)
        incident_rate: 0.05,
      },
    ],
  };
}

/**
 * Route 2: Andheri → Dadar → CST (Train Only)
 */
function getAndheriCSTTrainRoute(): TrafficRoute {
  return {
    id: "andheri-cst-train",
    name: "🚆 Andheri → CST (Train)",
    origin: "Andheri, Mumbai",
    destination: "CST, Mumbai",
    departure_time: "09:30",
    total_distance_km: 16.2,
    total_base_eta_min: 52,
    segments: [
      {
        id: "seg-andheri-dadar-train",
        name: "Andheri → Dadar (Central Line Train)",
        mode: "train",
        start_lat: MUMBAI_STATIONS.ANDHERI.lat,
        start_lng: MUMBAI_STATIONS.ANDHERI.lng,
        end_lat: MUMBAI_STATIONS.DADAR.lat,
        end_lng: MUMBAI_STATIONS.DADAR.lng,
        distance_km: 10.1,
        base_eta_min: 35,
        traffic_density: 0.0,
        crowd_score: 0.72, // 🟥 High crowd - peak hour
        incident_rate: 0.08,
      },
      {
        id: "seg-dadar-cst-train",
        name: "Dadar → CST (Continuation/Local Train)",
        mode: "train",
        start_lat: MUMBAI_STATIONS.DADAR.lat,
        start_lng: MUMBAI_STATIONS.DADAR.lng,
        end_lat: MUMBAI_STATIONS.CST.lat,
        end_lng: MUMBAI_STATIONS.CST.lng,
        distance_km: 6.1,
        base_eta_min: 17,
        traffic_density: 0.0,
        crowd_score: 0.68, // 🟨 Moderate-high crowd
        incident_rate: 0.06,
      },
    ],
  };
}

/**
 * Route 3: Andheri → Bandra → Dadar → CST (Multi-Modal)
 */
function getAndheriCSTMultiModalRoute(): TrafficRoute {
  return {
    id: "andheri-cst-multimodal",
    name: "🔁 Andheri → CST (Multi-Modal)",
    origin: "Andheri, Mumbai",
    destination: "CST, Mumbai",
    departure_time: "09:30",
    total_distance_km: 20.8,
    total_base_eta_min: 58,
    segments: [
      {
        id: "seg-andheri-bandra-car",
        name: "Andheri → Bandra (Car via Linking Road)",
        mode: "car",
        start_lat: MUMBAI_STATIONS.ANDHERI.lat,
        start_lng: MUMBAI_STATIONS.ANDHERI.lng,
        end_lat: MUMBAI_STATIONS.BANDRA.lat,
        end_lng: MUMBAI_STATIONS.BANDRA.lng,
        distance_km: 7.2,
        base_eta_min: 16,
        traffic_density: 0.75, // 🟨-🟥 Moderate-heavy
        crowd_score: 0.12,
        incident_rate: 0.04,
      },
      {
        id: "seg-bandra-station-walk",
        name: "Bandra Station Entry (Walk)",
        mode: "walk",
        start_lat: MUMBAI_STATIONS.BANDRA.lat,
        start_lng: MUMBAI_STATIONS.BANDRA.lng,
        end_lat: MUMBAI_STATIONS.BANDRA.lat,
        end_lng: MUMBAI_STATIONS.BANDRA.lng,
        distance_km: 0.1,
        base_eta_min: 2,
        traffic_density: 0.0,
        crowd_score: 0.55,
        incident_rate: 0.01,
      },
      {
        id: "seg-bandra-dadar-train",
        name: "Bandra → Dadar (Fast Local Train)",
        mode: "train",
        start_lat: MUMBAI_STATIONS.BANDRA.lat,
        start_lng: MUMBAI_STATIONS.BANDRA.lng,
        end_lat: MUMBAI_STATIONS.DADAR.lat,
        end_lng: MUMBAI_STATIONS.DADAR.lng,
        distance_km: 5.8,
        base_eta_min: 25,
        traffic_density: 0.0,
        crowd_score: 0.65, // 🟨 Moderate crowd
        incident_rate: 0.05,
      },
      {
        id: "seg-dadar-cst-train-mm",
        name: "Dadar → CST (Local Continuation)",
        mode: "train",
        start_lat: MUMBAI_STATIONS.DADAR.lat,
        start_lng: MUMBAI_STATIONS.DADAR.lng,
        end_lat: MUMBAI_STATIONS.CST.lat,
        end_lng: MUMBAI_STATIONS.CST.lng,
        distance_km: 6.1,
        base_eta_min: 15,
        traffic_density: 0.0,
        crowd_score: 0.62,
        incident_rate: 0.04,
      },
    ],
  };
}

/**
 * Generate multiple routes for Andheri → CST
 */
export function getAndheriToCSTPRoutes(): TrafficRoute[] {
  return [
    getAndheriCSTRoadRoute(),
    getAndheriCSTTrainRoute(),
    getAndheriCSTMultiModalRoute(),
  ];
}

/**
 * Get all available demo routes (can be extended)
 */
export function getDemoRoutes(): TrafficRoute[] {
  return [getMumbaiDemoRoute()];
}

/**
 * Simulate dynamic traffic changes based on time
 * Traffic patterns vary throughout the day
 */
export function getTrafficForTime(baseRoute: TrafficRoute, timeStr: string): TrafficRoute {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const timeOfDay = hours + minutes / 60;

  // Scale traffic intensity based on time
  let trafficMultiplier = 0.3; // Default off-peak

  if (timeOfDay >= 7 && timeOfDay < 10) {
    trafficMultiplier = 0.9; // Morning rush (7-10 AM)
  } else if (timeOfDay >= 10 && timeOfDay < 16) {
    trafficMultiplier = 0.4; // Mid-day
  } else if (timeOfDay >= 16 && timeOfDay < 20) {
    trafficMultiplier = 0.8; // Evening rush (4-8 PM)
  } else if (timeOfDay >= 20 || timeOfDay < 7) {
    trafficMultiplier = 0.2; // Late night / early morning
  }

  // Apply multiplier to all segments
  const updatedSegments = baseRoute.segments.map((seg) => ({
    ...seg,
    traffic_density: Math.min(1, seg.traffic_density * trafficMultiplier),
    crowd_score:
      seg.mode === "train" || seg.mode === "metro"
        ? Math.min(1, seg.crowd_score * trafficMultiplier * 1.1) // Train crowds scale differently
        : seg.crowd_score,
  }));

  return {
    ...baseRoute,
    segments: updatedSegments,
  };
}

/**
 * Calculate route-level metrics
 */
export interface RouteMetrics {
  total_traffic_density: number;
  total_crowd_score: number;
  total_incident_risk: number;
  adjusted_eta_min: number;
  overall_signal: TrafficSignal;
}

export function calculateRouteMetrics(route: TrafficRoute): RouteMetrics {
  const segmentCount = route.segments.length;

  const total_traffic_density =
    route.segments.reduce((sum, seg) => sum + seg.traffic_density, 0) / segmentCount;

  const total_crowd_score =
    route.segments.reduce((sum, seg) => sum + seg.crowd_score, 0) / segmentCount;

  const total_incident_risk =
    route.segments.reduce((sum, seg) => sum + seg.incident_rate, 0) / segmentCount;

  // Calculate adjusted ETA by summing segment ETAs adjusted by traffic
  const adjusted_eta_min = route.segments.reduce((sum, seg) => {
    const adjusted = calculateAdjustedEta(
      seg.base_eta_min,
      seg.traffic_density,
      seg.incident_rate
    );
    return sum + adjusted;
  }, 0);

  const overall_signal = getTrafficSignal(total_traffic_density, total_crowd_score);

  return {
    total_traffic_density,
    total_crowd_score,
    total_incident_risk,
    adjusted_eta_min,
    overall_signal,
  };
}
