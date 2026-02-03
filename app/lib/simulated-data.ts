import type { RouteOption, AlertZoneData } from "./types";

/**
 * Sample routes around a typical urban area
 * These are simulated data - in production, would come from mapping API
 */
export const SAMPLE_ROUTES: RouteOption[] = [
  {
    id: "route-express",
    name: "Express Highway (I-405)",
    startLat: 40.7128,
    startLng: -74.006,
    endLat: 40.6892,
    endLng: -74.0445,
    distance: 12.5,
    baseEta: 25,
    geometry: [
      [40.7128, -74.006],
      [40.7105, -74.0134],
      [40.7082, -74.0208],
      [40.6892, -74.0445],
    ],
  },
  {
    id: "route-scenic",
    name: "Scenic Route via Park",
    startLat: 40.7128,
    startLng: -74.006,
    endLat: 40.6892,
    endLng: -74.0445,
    distance: 15.2,
    baseEta: 35,
    geometry: [
      [40.7128, -74.006],
      [40.7245, -74.0089],
      [40.7281, -73.9716],
      [40.6892, -74.0445],
    ],
  },
  {
    id: "route-local",
    name: "Local Streets",
    startLat: 40.7128,
    startLng: -74.006,
    endLat: 40.6892,
    endLng: -74.0445,
    distance: 14.1,
    baseEta: 40,
    geometry: [
      [40.7128, -74.006],
      [40.7089, -73.9819],
      [40.6950, -74.0012],
      [40.6892, -74.0445],
    ],
  },
];

/**
 * Sample alert zones - mocked for demo
 */
export const SAMPLE_ALERT_ZONES: AlertZoneData[] = [
  {
    name: "Downtown Construction Zone",
    type: "INFRASTRUCTURE_ISSUE",
    centerLat: 40.7105,
    centerLng: -74.0134,
    radiusKm: 1.2,
    severity: 3,
    description: "Active construction on Main Street, expect delays 08:00-18:00",
  },
  {
    name: "Transit Authority Alert",
    type: "SAFETY_ADVISORY",
    centerLat: 40.7245,
    centerLng: -74.0089,
    radiusKm: 0.8,
    severity: 2,
    description: "Increased security presence due to event. Avoid if possible.",
  },
  {
    name: "Historical Incident Zone",
    type: "TRAFFIC_HOTSPOT",
    centerLat: 40.7082,
    centerLng: -74.0208,
    radiusKm: 1.5,
    severity: 4,
    description: "Chronic bottleneck. Delays common during peak hours.",
  },
];

/**
 * Generate simulated historical journey statistics
 * This data would normally come from aggregated historical journeys
 */
export function generateSimulatedJourneyStats() {
  return {
    // Rusher profile: prefers speed, high risk acceptance
    rusher: {
      speedPreference: 0.75,
      rerouteTendency: 0.6,
      crowdTolerance: 0.5,
      transferTolerance: 0.4,
      riskAcceptance: 0.8,
    },
    // Safe Planner: prefers reliability, low risk
    safePlanner: {
      speedPreference: 0.2,
      rerouteTendency: 0.15,
      crowdTolerance: 0.4,
      transferTolerance: 0.5,
      riskAcceptance: 0.1,
    },
    // Comfort Seeker: avoids crowds and transfers
    comfortSeeker: {
      speedPreference: 0.3,
      rerouteTendency: 0.2,
      crowdTolerance: 0.15,
      transferTolerance: 0.2,
      riskAcceptance: 0.3,
    },
    // Explorer: willing to try different routes
    explorer: {
      speedPreference: 0.5,
      rerouteTendency: 0.8,
      crowdTolerance: 0.6,
      transferTolerance: 0.7,
      riskAcceptance: 0.7,
    },
  };
}

/**
 * Generate simulated RCI scores for routes by time of day
 * Morning rush: lower RCI due to congestion
 * Mid-day: higher RCI
 * Evening rush: lower RCI again
 */
export function generateSimulatedRCI(routeId: string, timeWindow: string): number {
  const hour = parseInt(timeWindow.split(":")[0]);

  // Base scores vary by route
  const baseScores: Record<string, number> = {
    "route-express": 0.72,
    "route-scenic": 0.65,
    "route-local": 0.55,
  };

  const base = baseScores[routeId] || 0.6;

  // Time-based adjustment
  let multiplier = 1;
  if (hour >= 7 && hour <= 9) {
    // Morning rush
    multiplier = 0.65;
  } else if (hour >= 17 && hour <= 19) {
    // Evening rush
    multiplier = 0.6;
  } else if (hour >= 10 && hour <= 16) {
    // Mid-day
    multiplier = 1.1;
  } else {
    // Off-peak
    multiplier = 0.95;
  }

  // Add some pseudo-randomness based on route+hour hash
  const hash = (routeId.charCodeAt(6) + hour) % 10;
  const randomFactor = 0.95 + hash / 100;

  return Math.min(1, base * multiplier * randomFactor);
}

/**
 * Generate simulated failure score for a location at a given time
 */
export function generateSimulatedFailureScore(locationId: string, timeWindow: string): number {
  const hour = parseInt(timeWindow.split(":")[0]);

  // Baseline failure score varies by location
  const baselineFailure: Record<string, number> = {
    downtown: 0.35,
    midtown: 0.25,
    uptown: 0.15,
    waterfront: 0.2,
  };

  const baseline = baselineFailure[locationId] || 0.25;

  // Peak hour penalty
  let peakPenalty = 0;
  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
    peakPenalty = 0.2;
  } else if ((hour >= 11 && hour <= 13) || (hour >= 14 && hour <= 15)) {
    peakPenalty = 0.1;
  }

  return Math.min(1, baseline + peakPenalty);
}

/**
 * Generate simulated crowd levels (0-100)
 */
export function generateSimulatedCrowdLevel(routeId: string, timeWindow: string): number {
  const hour = parseInt(timeWindow.split(":")[0]);

  const routeBaseline: Record<string, number> = {
    "route-express": 60,
    "route-scenic": 40,
    "route-local": 70,
  };

  const baseline = routeBaseline[routeId] || 50;

  // Peak hour multiplier
  let multiplier = 1;
  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
    multiplier = 1.4;
  } else if ((hour >= 11 && hour <= 13)) {
    multiplier = 1.1;
  } else if (hour >= 22 || hour <= 5) {
    multiplier = 0.3;
  }

  return Math.min(100, baseline * multiplier);
}

/**
 * Simulate journey outcome
 */
export function simulateJourneyOutcome(
  selectedRouteId: string,
  timeWindow: string
): {
  successfullyArrived: boolean;
  actualTravelTime: number;
  delayMinutes: number;
  failureReasons: string[];
} {
  const baseETA: Record<string, number> = {
    "route-express": 25,
    "route-scenic": 35,
    "route-local": 40,
  };

  const eta = baseETA[selectedRouteId] || 30;
  const failureScore = generateSimulatedFailureScore("downtown", timeWindow);

  // Simulate whether delay occurs
  const delayOccurs = Math.random() < failureScore;

  if (delayOccurs) {
    const delayMinutes = Math.floor(Math.random() * 20) + 5; // 5-25 minutes delay
    return {
      successfullyArrived: true,
      actualTravelTime: eta + delayMinutes,
      delayMinutes,
      failureReasons: ["Traffic congestion", "Unexpected incident"],
    };
  }

  // Small variation in successful journey
  const variation = Math.floor((Math.random() - 0.5) * 4);
  return {
    successfullyArrived: true,
    actualTravelTime: eta + variation,
    delayMinutes: Math.max(0, variation),
    failureReasons: [],
  };
}
