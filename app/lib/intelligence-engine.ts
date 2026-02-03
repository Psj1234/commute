import { THRESHOLDS, PERSONA_WEIGHTS, RCI_WEIGHTS } from "./types";
import type { LocationStats, PersonaScores, RCIComponents, UserJourneyData } from "./types";
import { calculateOSINTOverlap, calculateDecayedSeverity } from "./osint-data";
import type { OSINTZone } from "./osint-data";

/**
 * Bucket time into 15-minute windows (e.g., 08:45 → "08:30-08:45")
 */
export function bucketTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes();
  const windowStart = Math.floor(minutes / 15) * 15;
  const windowEnd = windowStart + 15;
  
  const startStr = `${hours}:${windowStart.toString().padStart(2, "0")}`;
  const endStr = `${hours}:${windowEnd.toString().padStart(2, "0")}`;
  
  return `${startStr}-${endStr}`;
}

/**
 * Compute Route Confidence Index (RCI) from components
 * RCI combines on-time probability, transfer success, crowd stability, delay variance, and last-mile availability
 */
export function computeRCI(components: {
  onTimeProb: number;
  transferSuccess: number;
  crowdStability: number;
  delayVariance: number;
  lastMileAvail: number;
}): RCIComponents {
  const rciScore =
    RCI_WEIGHTS.onTimeProb * components.onTimeProb +
    RCI_WEIGHTS.transferSuccess * components.transferSuccess +
    RCI_WEIGHTS.crowdStability * components.crowdStability +
    RCI_WEIGHTS.delayVariance * components.delayVariance +
    RCI_WEIGHTS.lastMileAvail * components.lastMileAvail;

  return {
    onTimeProb: Math.min(1, Math.max(0, components.onTimeProb)),
    transferSuccess: Math.min(1, Math.max(0, components.transferSuccess)),
    crowdStability: Math.min(1, Math.max(0, components.crowdStability)),
    delayVariance: Math.min(1, Math.max(0, components.delayVariance)),
    lastMileAvail: Math.min(1, Math.max(0, components.lastMileAvail)),
    rciScore: Math.min(1, Math.max(0, rciScore)),
  };
}

/**
 * Calculate failure score from location statistics
 * Combines delay probability, reroute rate, and average wait time
 */
export function calculateFailureScore(stats: LocationStats): number {
  const w1 = 0.4; // weight for delay probability
  const w2 = 0.3; // weight for reroute rate
  const w3 = 0.3; // weight for normalized wait time

  const normalizedWaitTime = Math.min(stats.avgWait / 600, 1); // normalize to 10 minutes max

  const failureScore =
    w1 * stats.delayProbability + w2 * stats.rerouteTendency + w3 * normalizedWaitTime;

  return Math.min(1, Math.max(0, failureScore));
}

/**
 * Infer commute persona from journey history
 */
export function inferPersona(journeyData: UserJourneyData): {
  persona: "RUSHER" | "SAFE_PLANNER" | "COMFORT_SEEKER" | "EXPLORER";
  scores: PersonaScores;
  confidence: number;
} {
  const rusherScore =
    PERSONA_WEIGHTS.RUSHER.speedPref * journeyData.speedPreference +
    PERSONA_WEIGHTS.RUSHER.rerouteTendency * journeyData.rerouteTendency +
    PERSONA_WEIGHTS.RUSHER.riskAcceptance * journeyData.riskAcceptance;

  const safePlannerScore =
    PERSONA_WEIGHTS.SAFE_PLANNER.rciScore * (1 - journeyData.riskAcceptance) +
    PERSONA_WEIGHTS.SAFE_PLANNER.rerouteTendency * (1 - journeyData.rerouteTendency) +
    PERSONA_WEIGHTS.SAFE_PLANNER.transferTolerance * journeyData.transferTolerance;

  const comfortSeekerScore =
    PERSONA_WEIGHTS.COMFORT_SEEKER.crowdTolerance * (1 - journeyData.crowdTolerance) +
    PERSONA_WEIGHTS.COMFORT_SEEKER.transferTolerance * (1 - journeyData.transferTolerance) +
    PERSONA_WEIGHTS.COMFORT_SEEKER.speedPref * (1 - journeyData.speedPreference);

  const explorerScore =
    PERSONA_WEIGHTS.EXPLORER.rerouteTendency * journeyData.rerouteTendency +
    PERSONA_WEIGHTS.EXPLORER.transferTolerance * journeyData.transferTolerance +
    PERSONA_WEIGHTS.EXPLORER.riskAcceptance * journeyData.riskAcceptance;

  const scores: PersonaScores = {
    rusher: Math.min(1, Math.max(0, rusherScore)),
    safePlanner: Math.min(1, Math.max(0, safePlannerScore)),
    comfortSeeker: Math.min(1, Math.max(0, comfortSeekerScore)),
    explorer: Math.min(1, Math.max(0, explorerScore)),
  };

  const sum = scores.rusher + scores.safePlanner + scores.comfortSeeker + scores.explorer;
  const maxScore = Math.max(scores.rusher, scores.safePlanner, scores.comfortSeeker, scores.explorer);
  const confidence = maxScore / (sum || 1);

  let persona: "RUSHER" | "SAFE_PLANNER" | "COMFORT_SEEKER" | "EXPLORER" = "SAFE_PLANNER";
  if (scores.rusher === maxScore) persona = "RUSHER";
  else if (scores.safePlanner === maxScore) persona = "SAFE_PLANNER";
  else if (scores.comfortSeeker === maxScore) persona = "COMFORT_SEEKER";
  else if (scores.explorer === maxScore) persona = "EXPLORER";

  return { persona, scores, confidence };
}

/**
 * Calculate stress score for a route based on RCI and risk factors
 */
export function calculateStressScore(
  rci: number,
  failureScore: number,
  crowdFactor: number,
  travelTime: number
): number {
  const rciPenalty = (1 - rci) * 0.3;
  const failurePenalty = failureScore * 0.3;
  const crowdPenalty = crowdFactor * 0.2;
  const timePenalty = Math.min(travelTime / 120, 1) * 0.2; // normalize to 2 hours

  return Math.min(1, rciPenalty + failurePenalty + crowdPenalty + timePenalty);
}

/**
 * Check if coordinates are within an alert zone (circle)
 */
export function isInAlertZone(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  radiusKm: number
): boolean {
  const R = 6371; // Earth's radius in km
  const dLat = ((centerLat - lat) * Math.PI) / 180;
  const dLng = ((centerLng - lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat * Math.PI) / 180) *
      Math.cos((centerLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance <= radiusKm;
}

/**
 * Normalize coordinates to [-180, 180] for longitude and [-90, 90] for latitude
 */
export function normalizeCoordinates(lat: number, lng: number): [number, number] {
  let normalizedLat = lat;
  let normalizedLng = lng;

  // Normalize latitude
  while (normalizedLat > 90) normalizedLat -= 180;
  while (normalizedLat < -90) normalizedLat += 180;

  // Normalize longitude
  while (normalizedLng > 180) normalizedLng -= 360;
  while (normalizedLng < -180) normalizedLng += 360;

  return [normalizedLat, normalizedLng];
}

/**
 * Apply OSINT soft penalty to route RCI score
 * OSINT zones reduce confidence gradually based on overlap and severity
 * Routes are NOT eliminated, just penalized
 */
export function applyOSINTScoring(
  rciScore: number,
  routeStartLat: number,
  routeStartLng: number,
  routeEndLat: number,
  routeEndLng: number,
  osintZones?: OSINTZone[]
): {
  adjustedRCI: number;
  osintPenalty: number;
  affectedZones: OSINTZone[];
} {
  if (!osintZones || osintZones.length === 0) {
    return {
      adjustedRCI: rciScore,
      osintPenalty: 0,
      affectedZones: [],
    };
  }

  const { overlapPercentage, affectedZones } = calculateOSINTOverlap(routeStartLat, routeStartLng, routeEndLat, routeEndLng, osintZones);

  // Calculate average severity of affected zones
  let avgSeverity = 1;
  if (affectedZones.length > 0) {
    const totalSeverity = affectedZones.reduce((sum, zone) => sum + calculateDecayedSeverity(zone), 0);
    avgSeverity = totalSeverity / affectedZones.length;
  }

  // Apply soft penalty: max 15% reduction based on overlap and severity
  const severityWeight = (avgSeverity - 1) / 4; // Convert 1-5 to 0-1
  const osintPenalty = overlapPercentage * severityWeight * 0.15; // Max 15% penalty

  const adjustedRCI = Math.max(0, rciScore - osintPenalty);

  return {
    adjustedRCI,
    osintPenalty,
    affectedZones,
  };
}
