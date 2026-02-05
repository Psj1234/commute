// NEW: Enhanced RCI calculation with failure history and time-window patterns
import { bucketTime, computeRCI, applyOSINTScoring } from "./intelligence-engine";
import type { OSINTZone } from "./osint-data";

export interface FailureHistoryRecord {
  route_signature: string; // hash of start+end coords
  time_window: string; // "08:30-08:45"
  failure_count: number;
  total_journeys: number;
  avg_delay_minutes: number;
  last_failure_date: string;
}

export interface TimeWindowPattern {
  time_window: string;
  reliability_multiplier: number; // 0.7 = 30% less reliable in this window
  typical_delay_minutes: number;
  congestion_level: number; // 0-1
}

export interface EnhancedRCIResult {
  rci: number;
  original_rci: number;
  explanation: string;
  failure_penalty: number;
  time_window_penalty: number;
  osint_penalty: number;
  persona_bonus: number;
  components: {
    on_time_prob: number;
    transfer_success: number;
    crowd_stability: number;
    delay_variance: number;
    last_mile_avail: number;
  };
  risk_factors: string[];
  confidence_level: "HIGH" | "MEDIUM" | "LOW";
}

// NEW: Simulated failure history database
const FAILURE_HISTORY: { [key: string]: FailureHistoryRecord[] } = {
  // Route signature format: "lat1_lng1_lat2_lng2" (rounded to 2 decimals)
  "19.23_72.86_19.17_72.95": [
    {
      route_signature: "19.23_72.86_19.17_72.95",
      time_window: "08:30-08:45",
      failure_count: 15,
      total_journeys: 50,
      avg_delay_minutes: 18,
      last_failure_date: "2026-02-04",
    },
    {
      route_signature: "19.23_72.86_19.17_72.95",
      time_window: "08:45-09:00",
      failure_count: 22,
      total_journeys: 60,
      avg_delay_minutes: 25,
      last_failure_date: "2026-02-03",
    },
  ],
  // Mumbai to Gandhinagar route
  "19.23_72.86_23.22_72.65": [
    {
      route_signature: "19.23_72.86_23.22_72.65",
      time_window: "06:00-06:15",
      failure_count: 3,
      total_journeys: 20,
      avg_delay_minutes: 45,
      last_failure_date: "2026-01-28",
    },
  ],
};

// NEW: Time window patterns (rush hour, off-peak, etc.)
const TIME_WINDOW_PATTERNS: { [window: string]: TimeWindowPattern } = {
  // Morning rush
  "08:00-08:15": { time_window: "08:00-08:15", reliability_multiplier: 0.65, typical_delay_minutes: 20, congestion_level: 0.85 },
  "08:15-08:30": { time_window: "08:15-08:30", reliability_multiplier: 0.60, typical_delay_minutes: 25, congestion_level: 0.90 },
  "08:30-08:45": { time_window: "08:30-08:45", reliability_multiplier: 0.55, typical_delay_minutes: 30, congestion_level: 0.95 },
  "08:45-09:00": { time_window: "08:45-09:00", reliability_multiplier: 0.58, typical_delay_minutes: 28, congestion_level: 0.92 },
  "09:00-09:15": { time_window: "09:00-09:15", reliability_multiplier: 0.70, typical_delay_minutes: 15, congestion_level: 0.75 },
  
  // Evening rush
  "17:00-17:15": { time_window: "17:00-17:15", reliability_multiplier: 0.68, typical_delay_minutes: 18, congestion_level: 0.82 },
  "17:15-17:30": { time_window: "17:15-17:30", reliability_multiplier: 0.62, typical_delay_minutes: 22, congestion_level: 0.88 },
  "17:30-17:45": { time_window: "17:30-17:45", reliability_multiplier: 0.58, typical_delay_minutes: 27, congestion_level: 0.93 },
  "17:45-18:00": { time_window: "17:45-18:00", reliability_multiplier: 0.60, typical_delay_minutes: 25, congestion_level: 0.90 },
  "18:00-18:15": { time_window: "18:00-18:15", reliability_multiplier: 0.65, typical_delay_minutes: 20, congestion_level: 0.85 },
  
  // Off-peak (default)
  "DEFAULT": { time_window: "DEFAULT", reliability_multiplier: 0.90, typical_delay_minutes: 5, congestion_level: 0.40 },
};

// NEW: Persona-based route preferences
const PERSONA_ADJUSTMENTS = {
  RUSHER: {
    prefer_fast_risky: 0.1, // Willing to take 10% RCI hit for faster route
    avoid_delays: 0.05,
  },
  SAFE_PLANNER: {
    prefer_reliable: 0.15, // Boost RCI by 15% for reliable routes
    avoid_failures: 0.20, // Heavy penalty on routes with failure history
  },
  COMFORT_SEEKER: {
    avoid_crowds: 0.10,
    prefer_smooth: 0.08,
  },
  EXPLORER: {
    novelty_bonus: 0.05, // Slight bonus for alternative routes
  },
};

/**
 * Generate route signature from coordinates
 */
function getRouteSignature(startLat: number, startLng: number, endLat: number, endLng: number): string {
  return `${startLat.toFixed(2)}_${startLng.toFixed(2)}_${endLat.toFixed(2)}_${endLng.toFixed(2)}`;
}

/**
 * Get failure history for a route in a specific time window
 */
function getFailureHistory(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  timeWindow: string
): FailureHistoryRecord | null {
  const signature = getRouteSignature(startLat, startLng, endLat, endLng);
  const history = FAILURE_HISTORY[signature];
  
  if (!history) return null;
  
  return history.find(h => h.time_window === timeWindow) || null;
}

/**
 * Get time window pattern for current time
 */
function getTimeWindowPattern(timeWindow: string): TimeWindowPattern {
  return TIME_WINDOW_PATTERNS[timeWindow] || TIME_WINDOW_PATTERNS["DEFAULT"];
}

/**
 * NEW: Enhanced RCI calculation with all intelligence factors
 */
export function calculateEnhancedRCI(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  baseETA: number, // minutes
  distance: number, // km
  currentTime: Date,
  userPersona: "RUSHER" | "SAFE_PLANNER" | "COMFORT_SEEKER" | "EXPLORER" = "SAFE_PLANNER",
  osintZones?: OSINTZone[]
): EnhancedRCIResult {
  const timeWindow = bucketTime(currentTime);
  const riskFactors: string[] = [];
  
  // 1. Base RCI components (from existing logic)
  const baseDelayRisk = 0.2 + 0.15 * Math.random();
  const baseTrafficStability = 0.75 + 0.15 * Math.random();
  const baseSafetyScore = 0.80 + 0.15 * Math.random();
  const baseConsistency = 0.70 + 0.20 * Math.random();
  
  let onTimeProb = 1 - baseDelayRisk;
  let transferSuccess = baseTrafficStability;
  let crowdStability = baseSafetyScore;
  let delayVariance = baseConsistency;
  let lastMileAvail = 0.85 + 0.10 * Math.random();
  
  // 2. Apply failure history penalty
  const failureHistory = getFailureHistory(startLat, startLng, endLat, endLng, timeWindow);
  let failurePenalty = 0;
  
  if (failureHistory) {
    const failureRate = failureHistory.failure_count / failureHistory.total_journeys;
    failurePenalty = failureRate * 0.30; // Up to 30% penalty
    onTimeProb *= (1 - failureRate);
    delayVariance *= (1 - failurePenalty);
    
    riskFactors.push(
      `⚠️ ${(failureRate * 100).toFixed(0)}% failure rate in ${timeWindow} time window (${failureHistory.failure_count}/${failureHistory.total_journeys} journeys)`
    );
    riskFactors.push(
      `📊 Avg delay: ${failureHistory.avg_delay_minutes} min in past failures`
    );
  }
  
  // 3. Apply time-window patterns
  const timePattern = getTimeWindowPattern(timeWindow);
  const timeWindowPenalty = (1 - timePattern.reliability_multiplier) * 0.25; // Up to 25% penalty
  
  onTimeProb *= timePattern.reliability_multiplier;
  crowdStability *= (1 - timePattern.congestion_level * 0.3);
  
  if (timePattern.congestion_level > 0.75) {
    riskFactors.push(
      `🚦 High congestion period (${(timePattern.congestion_level * 100).toFixed(0)}% congestion level)`
    );
    riskFactors.push(
      `⏱️ Typical delay: +${timePattern.typical_delay_minutes} min at this time`
    );
  }
  
  // 4. Apply OSINT overlays
  let osintPenalty = 0;
  if (osintZones && osintZones.length > 0) {
    const osintResult = applyOSINTScoring(
      1.0, // Base RCI before OSINT
      startLat,
      startLng,
      endLat,
      endLng,
      osintZones
    );
    osintPenalty = osintResult.osintPenalty;
    
    if (osintResult.affectedZones.length > 0) {
      riskFactors.push(
        `🔴 Route affected by ${osintResult.affectedZones.length} OSINT zone(s)`
      );
      osintResult.affectedZones.forEach(zone => {
        riskFactors.push(`  └─ ${zone.zone_type}: ${zone.description}`);
      });
    }
  }
  
  // 5. Compute base RCI
  const rciComponents = computeRCI({
    onTimeProb,
    transferSuccess,
    crowdStability,
    delayVariance,
    lastMileAvail,
  });
  
  let originalRCI = rciComponents.rciScore;
  
  // 6. Apply persona adjustments
  let personaBonus = 0;
  if (userPersona === "SAFE_PLANNER" && rciComponents.rciScore > 0.7) {
    personaBonus = PERSONA_ADJUSTMENTS.SAFE_PLANNER.prefer_reliable;
  } else if (userPersona === "SAFE_PLANNER" && failurePenalty > 0.15) {
    failurePenalty += PERSONA_ADJUSTMENTS.SAFE_PLANNER.avoid_failures;
  }
  
  // 7. Calculate final RCI
  let finalRCI = originalRCI - failurePenalty - timeWindowPenalty - osintPenalty + personaBonus;
  finalRCI = Math.max(0.1, Math.min(1.0, finalRCI)); // Clamp between 0.1 and 1.0
  
  // 8. Generate explanation
  let explanation = "";
  if (finalRCI > 0.75) {
    explanation = `✅ Highly reliable route (RCI: ${(finalRCI * 100).toFixed(0)}%)`;
    if (failureHistory) {
      explanation += ` despite historical delays. Time window is favorable.`;
    } else {
      explanation += `. No major failures recorded in this time window.`;
    }
  } else if (finalRCI > 0.55) {
    explanation = `⚠️ Moderately reliable (RCI: ${(finalRCI * 100).toFixed(0)}%)`;
    if (failurePenalty > 0.1) {
      explanation += `. Route has ${(failurePenalty * 100).toFixed(0)}% failure penalty.`;
    }
    if (timeWindowPenalty > 0.1) {
      explanation += ` Congestion expected in ${timeWindow}.`;
    }
  } else {
    explanation = `🔴 Lower reliability (RCI: ${(finalRCI * 100).toFixed(0)}%)`;
    if (failurePenalty > 0.15) {
      explanation += `. High failure rate in this time window.`;
    }
    if (osintPenalty > 0.05) {
      explanation += ` Route affected by advisory zones.`;
    }
    explanation += ` Consider alternative routes.`;
  }
  
  // 9. Determine confidence level
  let confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
  if (finalRCI >= 0.75) confidenceLevel = "HIGH";
  else if (finalRCI >= 0.55) confidenceLevel = "MEDIUM";
  else confidenceLevel = "LOW";
  
  return {
    rci: finalRCI,
    original_rci: originalRCI,
    explanation,
    failure_penalty: failurePenalty,
    time_window_penalty: timeWindowPenalty,
    osint_penalty: osintPenalty,
    persona_bonus: personaBonus,
    components: {
      on_time_prob: rciComponents.onTimeProb,
      transfer_success: rciComponents.transferSuccess,
      crowd_stability: rciComponents.crowdStability,
      delay_variance: rciComponents.delayVariance,
      last_mile_avail: rciComponents.lastMileAvail,
    },
    risk_factors: riskFactors,
    confidence_level: confidenceLevel,
  };
}

/**
 * Compare two routes and explain which is better for reliability
 */
export function compareRoutesForReliability(
  route1RCI: EnhancedRCIResult,
  route1ETA: number,
  route2RCI: EnhancedRCIResult,
  route2ETA: number
): string {
  const rciDiff = route1RCI.rci - route2RCI.rci;
  const etaDiff = route2ETA - route1ETA; // Positive if route1 is faster
  
  if (Math.abs(rciDiff) < 0.05) {
    return `Both routes have similar reliability (±5%). Choose based on ETA preference.`;
  }
  
  if (rciDiff > 0.10) {
    if (etaDiff < -10) {
      return `✅ Route 1 recommended: ${(rciDiff * 100).toFixed(0)}% more reliable, despite being ${Math.abs(etaDiff)} min slower. Reliability prioritized.`;
    } else {
      return `✅ Route 1 recommended: ${(rciDiff * 100).toFixed(0)}% more reliable and similar/faster ETA.`;
    }
  } else if (rciDiff < -0.10) {
    if (etaDiff > 10) {
      return `✅ Route 2 recommended: ${(Math.abs(rciDiff) * 100).toFixed(0)}% more reliable, despite being ${etaDiff} min slower. Reliability prioritized.`;
    } else {
      return `✅ Route 2 recommended: ${(Math.abs(rciDiff) * 100).toFixed(0)}% more reliable and similar/faster ETA.`;
    }
  }
  
  return `Routes have marginal reliability difference. Choose based on personal preference.`;
}
