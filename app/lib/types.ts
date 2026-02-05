export interface RouteOption {
  id: string;
  name: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  distance: number; // km
  baseEta: number; // minutes
  geometry: Array<[number, number]>;
}

export interface RCIComponents {
  onTimeProb: number;
  transferSuccess: number;
  crowdStability: number;
  delayVariance: number;
  lastMileAvail: number;
  rciScore: number;
}

export interface PersonaScores {
  rusher: number;
  safePlanner: number;
  comfortSeeker: number;
  explorer: number;
}

export interface UserJourneyData {
  speedPreference: number; // time saved vs safest
  rerouteTendency: number; // reroutes / total journeys
  crowdTolerance: number; // avg crowd level
  transferTolerance: number; // avg transfers
  riskAcceptance: number; // avg 1 - RCI
}

export interface EventData {
  locationId: string;
  eventType: "DELAY" | "IDLE" | "REROUTE";
  waitTime: number;
  timestamp: Date;
}

export interface LocationStats {
  locationId: string;
  timeWindow: string;
  totalVisits: number;
  delayEvents: number;
  reroutes: number;
  avgWait: number;
  delayProbability: number;
  failureScore: number;
}

export interface AlertZoneData {
  name: string;
  type: "SAFETY_ADVISORY" | "EMERGENCY" | "TRAFFIC_HOTSPOT" | "INFRASTRUCTURE_ISSUE";
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  severity: number; // 1-5
  description?: string;
}

export const THRESHOLDS = {
  DELAY_THRESHOLD: 5 * 60, // 5 minutes in seconds
  IDLE_THRESHOLD: 3 * 60, // 3 minutes in seconds
  FAILURE_THRESHOLD: 0.4, // failure score > 0.4 is a hotspot
  CONFIDENCE_THRESHOLD: 0.6, // persona confidence to update
  MIN_ACCEPTABLE_RCI: 0.5,
  TIME_WINDOW_INTERVAL: 15, // 15 minutes
};

export const PERSONA_WEIGHTS = {
  RUSHER: {
    speedPref: 0.4,
    rerouteTendency: 0.3,
    riskAcceptance: 0.3,
  },
  SAFE_PLANNER: {
    rciScore: 0.5,
    rerouteTendency: 0.3,
    transferTolerance: 0.2,
  },
  COMFORT_SEEKER: {
    crowdTolerance: 0.5,
    transferTolerance: 0.3,
    speedPref: 0.2,
  },
  EXPLORER: {
    rerouteTendency: 0.4,
    transferTolerance: 0.3,
    riskAcceptance: 0.3,
  },
};

export const RCI_WEIGHTS = {
  onTimeProb: 0.35,
  transferSuccess: 0.25,
  crowdStability: 0.2,
  delayVariance: 0.1,
  lastMileAvail: 0.1,
};

// MULTI-MODAL ROUTING TYPES (NON-BREAKING EXTENSION)
export type TransportMode = "CAR" | "TRAIN" | "FLIGHT" | "WALK" | "METRO";

export interface RouteLeg {
  leg_id: string;
  mode: TransportMode;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  travel_time_minutes: number;
  wait_time_minutes: number;
  crowd_score: number; // 0-1
  distance_km: number;
  geometry: string; // polyline6
  transfer_time_minutes?: number; // time to transfer between legs
}

export interface MultiModalRoute {
  route_id: string;
  mode_type: "SINGLE" | "MULTI";
  name: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  total_travel_time: number; // minutes (sum of all legs including wait)
  total_distance_km: number;
  transfer_count: number; // number of legs - 1
  legs: RouteLeg[];
  geometry: string; // combined polyline of all legs
  rci: number;
  components?: {
    crowd_stability?: number;
    transfer_success?: number;
  };
  persona_score?: number;
  persona_explanation?: string;
}
