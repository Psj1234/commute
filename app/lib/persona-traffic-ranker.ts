/**
 * Persona-Based Traffic-Aware Route Ranker
 * Re-ranks routes based on persona + traffic patterns
 */

import type { TrafficRoute, TrafficSegment } from "./traffic-intelligence";
import { calculateRouteMetrics, getModeEmoji, getTrafficSignal } from "./traffic-intelligence";

export type PersonaType = "RUSHER" | "SAFE_PLANNER" | "COMFORT_SEEKER" | "EXPLORER";

/**
 * Persona preference profiles
 * Each persona has different mode preferences based on traffic conditions
 */
export interface PersonaPreferences {
  name: string;
  description: string;
  modeWeights: Record<TrafficSegment["mode"], number>; // 0-1, higher = preferred
  trafficTolerance: number; // 0-1, higher = tolerates more traffic
  crowdTolerance: number; // 0-1, higher = tolerates more crowd
  priorityOrder: ("speed" | "reliability" | "comfort" | "discovery")[];
}

/**
 * Define persona profiles
 */
export const PERSONA_PROFILES: Record<PersonaType, PersonaPreferences> = {
  RUSHER: {
    name: "⚡ Rusher",
    description: "Fastest route with acceptable confidence",
    modeWeights: {
      car: 0.9, // Prefers car - fastest in most conditions
      cab: 0.85, // Cab also fast
      bike: 0.8,
      metro: 0.7, // Metro reasonable
      train: 0.65,
      bus: 0.4, // Avoids bus - too slow
      walk: 0.3,
    },
    trafficTolerance: 0.8, // Tolerates high traffic
    crowdTolerance: 0.5,
    priorityOrder: ["speed", "reliability", "comfort", "discovery"],
  },

  SAFE_PLANNER: {
    name: "🛡️ Safe Planner",
    description: "Most reliable route (default)",
    modeWeights: {
      metro: 0.95, // Most reliable in peak hours
      train: 0.9, // Train - predictable
      bus: 0.7, // Bus - reasonable reliability
      car: 0.6, // Car variable reliability
      cab: 0.65,
      bike: 0.3,
      walk: 0.4,
    },
    trafficTolerance: 0.3, // Avoids high traffic
    crowdTolerance: 0.7, // More tolerant of crowds
    priorityOrder: ["reliability", "speed", "comfort", "discovery"],
  },

  COMFORT_SEEKER: {
    name: "🛋️ Comfort Seeker",
    description: "Least crowded, fewer transfers",
    modeWeights: {
      car: 0.95, // Car - most comfortable
      cab: 0.9, // Cab - premium comfort
      bike: 0.6,
      walk: 0.5, // Short walks ok
      metro: 0.4, // Avoids metro - too crowded at peak
      train: 0.3, // Avoids train - too crowded
      bus: 0.2, // Avoids bus - least comfortable
    },
    trafficTolerance: 0.6, // Moderate traffic ok if it means comfort
    crowdTolerance: 0.2, // Low crowd tolerance
    priorityOrder: ["comfort", "speed", "reliability", "discovery"],
  },

  EXPLORER: {
    name: "🧭 Explorer",
    description: "Balanced & non-obvious routes",
    modeWeights: {
      bike: 0.85, // Prefers bike - novel experience
      walk: 0.8, // Prefers walk - discovery
      bus: 0.8, // Bus - local experience
      metro: 0.75, // Metro - urban exploration
      train: 0.75,
      car: 0.5, // Car - less novel
      cab: 0.4,
    },
    trafficTolerance: 0.7, // Tolerates traffic - opportunity to observe
    crowdTolerance: 0.8, // Crowds = local culture
    priorityOrder: ["discovery", "comfort", "reliability", "speed"],
  },
};

/**
 * Calculate persona-based score for a route
 * Returns a value 0-1, higher = better match for persona
 */
export function calculatePersonaRouteScore(
  route: TrafficRoute,
  persona: PersonaType
): number {
  const profile = PERSONA_PROFILES[persona];
  const metrics = calculateRouteMetrics(route);

  // 1. Mode preference score
  let modeScore = 0;
  let totalModeWeight = 0;

  for (const segment of route.segments) {
    const modeWeight = profile.modeWeights[segment.mode];
    modeScore += modeWeight;
    totalModeWeight += 1;
  }

  modeScore = modeScore / totalModeWeight;

  // 2. Traffic tolerance alignment
  let trafficMatch = 1; // 1.0 = perfect alignment
  const avgTrafficDensity = metrics.total_traffic_density;

  if (avgTrafficDensity > 0.7) {
    // Heavy traffic
    // Rusher and Explorer OK, Safe Planner prefers low, Comfort Seeker prefers low
    if (profile.trafficTolerance > 0.7) {
      trafficMatch = 1.0;
    } else if (profile.trafficTolerance > 0.4) {
      trafficMatch = 0.6;
    } else {
      trafficMatch = 0.2;
    }
  } else if (avgTrafficDensity > 0.4) {
    // Moderate traffic
    trafficMatch = Math.max(0.7, profile.trafficTolerance);
  } else {
    // Light traffic - everyone happy
    trafficMatch = Math.max(0.9, profile.trafficTolerance);
  }

  // 3. Crowd tolerance alignment
  let crowdMatch = 1;
  const avgCrowdScore = metrics.total_crowd_score;

  if (avgCrowdScore > 0.7) {
    // High crowd
    if (profile.crowdTolerance > 0.7) {
      crowdMatch = 1.0;
    } else if (profile.crowdTolerance > 0.4) {
      crowdMatch = 0.4;
    } else {
      crowdMatch = 0.1;
    }
  } else if (avgCrowdScore > 0.4) {
    // Moderate crowd
    crowdMatch = 0.5 + profile.crowdTolerance * 0.5;
  } else {
    // Low crowd
    crowdMatch = 0.9 + profile.crowdTolerance * 0.1;
  }

  // 4. Reliability component (based on incident risk)
  const regularityScore = Math.max(0.1, 1 - metrics.total_incident_risk);

  // 5. Combine scores with persona-specific weights
  let finalScore = 0;

  switch (persona) {
    case "RUSHER":
      // Speed + Mode preference most important
      finalScore =
        modeScore * 0.4 +
        trafficMatch * 0.3 +
        crowdMatch * 0.1 +
        regularityScore * 0.2;
      break;

    case "SAFE_PLANNER":
      // Reliability most important
      finalScore =
        regularityScore * 0.35 +
        modeScore * 0.3 +
        trafficMatch * 0.2 +
        crowdMatch * 0.15;
      break;

    case "COMFORT_SEEKER":
      // Crowd + Mode preference most important
      finalScore =
        crowdMatch * 0.4 +
        modeScore * 0.35 +
        trafficMatch * 0.15 +
        regularityScore * 0.1;
      break;

    case "EXPLORER":
      // Balance all factors with slight bias to discovery (mode variety)
      finalScore =
        modeScore * 0.35 +
        crowdMatch * 0.25 +
        trafficMatch * 0.2 +
        regularityScore * 0.2;
      break;
  }

  return Math.max(0, Math.min(1, finalScore));
}

/**
 * Rank routes based on persona
 */
export interface RankedRoute {
  route: TrafficRoute;
  persona: PersonaType;
  personaScore: number;
  explanation: string;
  segmentExplanations: string[];
}

export function rankRoutesByPersona(
  routes: TrafficRoute[],
  persona: PersonaType
): RankedRoute[] {
  const profile = PERSONA_PROFILES[persona];

  const rankedRoutes = routes.map((route) => {
    const personaScore = calculatePersonaRouteScore(route, persona);
    const metrics = calculateRouteMetrics(route);

    // Generate explanation
    let explanation = "";
    const reasons: string[] = [];

    // Check mode alignment
    const dominantModes = route.segments.map((s) => s.mode);
    const bestModes = dominantModes.filter(
      (m) => profile.modeWeights[m] >= 0.8
    );

    if (bestModes.length > 0) {
      reasons.push(
        `Features preferred modes: ${bestModes.map((m) => getModeEmoji(m)).join("")}`
      );
    }

    // Check traffic alignment
    if (metrics.total_traffic_density > 0.7 && profile.trafficTolerance > 0.7) {
      reasons.push("High traffic acceptable for your style");
    } else if (
      metrics.total_traffic_density < 0.4 &&
      profile.trafficTolerance < 0.4
    ) {
      reasons.push("Light traffic matches your preference");
    }

    // Check crowd alignment
    if (metrics.total_crowd_score > 0.7 && profile.crowdTolerance > 0.7) {
      reasons.push("Higher crowding acceptable");
    } else if (
      metrics.total_crowd_score < 0.4 &&
      profile.crowdTolerance < 0.4
    ) {
      reasons.push("Lighter crowds match your preference");
    }

    const segmentExplanations = route.segments.map((seg) => {
      const signal = getTrafficSignal(seg.traffic_density, seg.crowd_score);
      const adjustedEta = calculateAdjustedEta(
        seg.base_eta_min,
        seg.traffic_density,
        seg.incident_rate
      );
      return `${getModeEmoji(seg.mode)} ${seg.name}: ${adjustedEta}min ${signal}`;
    });

    explanation =
      reasons.length > 0
        ? reasons.join(" • ")
        : "Reasonable option for your commute style";

    return {
      route,
      persona,
      personaScore,
      explanation,
      segmentExplanations,
    };
  });

  // Sort by personaScore (highest first)
  rankedRoutes.sort((a, b) => b.personaScore - a.personaScore);

  return rankedRoutes;
}

/**
 * Import external function (avoiding circular deps)
 */
function calculateAdjustedEta(
  base_eta_min: number,
  traffic_density: number,
  incident_rate: number
): number {
  const trafficMultiplier = 1 + traffic_density * 1.5;
  const incidentDelay = incident_rate * 20;
  return Math.round(base_eta_min * trafficMultiplier + incidentDelay);
}

/**
 * Get default persona if not available
 */
export function getDefaultPersona(): PersonaType {
  return "SAFE_PLANNER";
}

/**
 * Get persona description with hint text
 */
export function getPersonaHint(persona: PersonaType): string {
  return PERSONA_PROFILES[persona].description;
}

/**
 * Get all persona names for UI
 */
export function getAllPersonas(): PersonaType[] {
  return ["RUSHER", "SAFE_PLANNER", "COMFORT_SEEKER", "EXPLORER"];
}
