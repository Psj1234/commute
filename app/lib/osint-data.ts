// OSINT Zone Simulation Data
// This module generates realistic, time-bound OSINT zones for demo purposes.
// All data is SIMULATED and MOCKED - no real user surveillance or crime prediction.

export interface OSINTZone {
  id: string;
  zone_type: "protest" | "congestion" | "health_alert" | "weather_disruption" | "infrastructure_issue" | "transit_delay";
  severity: number; // 1-5
  center_lat: number;
  center_lng: number;
  radius_km: number;
  description: string;
  time_window_start: Date;
  time_window_end: Date;
  decay_factor: number;
  is_active: boolean;
}

// Sample OSINT zones around downtown area (lat: 40.7128, lng: -74.0060)
export const SAMPLE_OSINT_ZONES: OSINTZone[] = [
  {
    id: "osint-1",
    zone_type: "congestion",
    severity: 4,
    center_lat: 40.7158,
    center_lng: -74.0074,
    radius_km: 0.8,
    description: "Heavy traffic congestion reported on 5th Avenue",
    time_window_start: new Date(new Date().getTime() - 2 * 3600000), // 2 hours ago
    time_window_end: new Date(new Date().getTime() + 1 * 3600000), // 1 hour from now
    decay_factor: 0.15,
    is_active: true,
  },
  {
    id: "osint-2",
    zone_type: "infrastructure_issue",
    severity: 3,
    center_lat: 40.7180,
    center_lng: -74.0022,
    radius_km: 0.5,
    description: "Road construction on Broadway - lane closure until 6 PM",
    time_window_start: new Date(new Date().getTime() - 1 * 3600000),
    time_window_end: new Date(new Date().getTime() + 4 * 3600000),
    decay_factor: 0.2,
    is_active: true,
  },
  {
    id: "osint-3",
    zone_type: "health_alert",
    severity: 2,
    center_lat: 40.7200,
    center_lng: -73.9950,
    radius_km: 1.2,
    description: "Flu vaccination clinic notice - high activity near medical centers",
    time_window_start: new Date(new Date().getTime() - 12 * 3600000),
    time_window_end: new Date(new Date().getTime() + 6 * 3600000),
    decay_factor: 0.05,
    is_active: true,
  },
  {
    id: "osint-4",
    zone_type: "weather_disruption",
    severity: 3,
    center_lat: 40.7100,
    center_lng: -74.0100,
    radius_km: 2.0,
    description: "Heavy rainfall expected - potential flooding in low-lying areas",
    time_window_start: new Date(new Date().getTime()),
    time_window_end: new Date(new Date().getTime() + 3 * 3600000),
    decay_factor: 0.25,
    is_active: true,
  },
  {
    id: "osint-5",
    zone_type: "transit_delay",
    severity: 2,
    center_lat: 40.7260,
    center_lng: -73.9897,
    radius_km: 0.6,
    description: "Subway signal issues - single-tracking on the N/R lines",
    time_window_start: new Date(new Date().getTime() - 30 * 60000),
    time_window_end: new Date(new Date().getTime() + 2 * 3600000),
    decay_factor: 0.18,
    is_active: true,
  },
];

/**
 * Get OSINT zones active during a specific time window
 * Filters zones by whether they overlap with the given time
 */
export function getActiveOSINTZones(timeWindow?: string): OSINTZone[] {
  const now = new Date();

  return SAMPLE_OSINT_ZONES.filter((zone) => {
    const isTimeActive = zone.time_window_start <= now && now <= zone.time_window_end;
    return zone.is_active && isTimeActive;
  });
}

/**
 * Calculate the actual severity of an OSINT zone considering decay
 * Zones lose severity over time as they become less relevant
 */
export function calculateDecayedSeverity(zone: OSINTZone, decayStartTime: Date = zone.time_window_start): number {
  const now = new Date();
  const elapsedHours = (now.getTime() - decayStartTime.getTime()) / (1000 * 60 * 60);

  // Severity decreases: initial_severity * e^(-decay_factor * elapsed_hours)
  const decayedSeverity = zone.severity * Math.exp(-zone.decay_factor * Math.max(0, elapsedHours));

  return Math.max(1, Math.min(5, decayedSeverity)); // Clamp between 1 and 5
}

/**
 * Calculate how much a route overlaps with OSINT zones
 * Returns a percentage (0-1) of the route passing through zones
 */
export function calculateOSINTOverlap(
  routeStartLat: number,
  routeStartLng: number,
  routeEndLat: number,
  routeEndLng: number,
  zones?: OSINTZone[]
): { overlapPercentage: number; affectedZones: OSINTZone[] } {
  const activeZones = zones || getActiveOSINTZones();
  const affectedZones: OSINTZone[] = [];
  let overlapScore = 0;

  for (const zone of activeZones) {
    // Simple distance check: if any point of the route is within the zone, it's affected
    const startDistance = haversineDistance(routeStartLat, routeStartLng, zone.center_lat, zone.center_lng);
    const endDistance = haversineDistance(routeEndLat, routeEndLng, zone.center_lat, zone.center_lng);

    const severity = calculateDecayedSeverity(zone);

    // If the route starts or ends in a zone
    if (startDistance < zone.radius_km || endDistance < zone.radius_km) {
      affectedZones.push(zone);
      overlapScore += severity * 0.1; // Each zone adds up to 50% impact
    }
  }

  // Clamp overlap to 0-1 (0-100%)
  const overlapPercentage = Math.min(1, overlapScore);

  return { overlapPercentage, affectedZones };
}

/**
 * Apply OSINT penalty to a route's RCI score
 * OSINT zones reduce confidence but don't eliminate routes
 */
export function applyOSINTSoftPenalty(rciScore: number, overlapPercentage: number, severity: number): number {
  const severityWeight = (severity - 1) / 4; // Convert 1-5 to 0-1
  const penalty = overlapPercentage * severityWeight * 0.15; // Max 15% penalty

  return Math.max(0, rciScore - penalty);
}

/**
 * Haversine distance formula: calculate distance between two lat/lng points
 * Returns distance in kilometers
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get a user-friendly description of an OSINT zone for tooltips/hovers
 */
export function getOSINTZoneTooltip(zone: OSINTZone): string {
  const decayedSeverity = calculateDecayedSeverity(zone);
  const endTime = zone.time_window_end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const severityLabel = ["Low", "Low-Medium", "Medium", "High", "Critical"][Math.floor(decayedSeverity) - 1];

  return `
[${zone.zone_type.toUpperCase().replace("_", " ")}]
${zone.description}

Severity: ${severityLabel}
Active until: ${endTime}

⚠️ Informational only - does not predict outcomes
  `.trim();
}

/**
 * Generate mock OSINT zone for testing
 */
export function generateMockOSINTZone(type: OSINTZone["zone_type"], severity: number): OSINTZone {
  const now = new Date();
  const randomLat = 40.7128 + (Math.random() - 0.5) * 0.1;
  const randomLng = -74.006 + (Math.random() - 0.5) * 0.1;

  return {
    id: `mock-osint-${Date.now()}`,
    zone_type: type,
    severity: Math.min(5, Math.max(1, severity)),
    center_lat: randomLat,
    center_lng: randomLng,
    radius_km: 0.5 + Math.random() * 1.5,
    description: `Mock ${type} zone for testing`,
    time_window_start: new Date(now.getTime() - 1 * 3600000),
    time_window_end: new Date(now.getTime() + 3 * 3600000),
    decay_factor: 0.1 + Math.random() * 0.2,
    is_active: true,
  };
}
