// NEW: Multi-modal transportation service
// Simulates train and flight routes between two cities

export type TravelMode = 'road' | 'train' | 'flight' | 'all';

export interface MultiModalRoute {
  mode: 'road' | 'train' | 'flight';
  mode_icon: string;
  provider?: string;
  departure_time?: string;
  arrival_time?: string;
  duration_minutes: number;
  distance_km?: number;
  stops?: number;
  cost_range: { min: number; max: number; currency: string };
  route_info: string;
  is_available: boolean;
}

// Calculate straight-line distance between two points (Haversine formula)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
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

// Simulate train routes
export function simulateTrainRoutes(
  start: { lat: number; lng: number; label?: string },
  end: { lat: number; lng: number; label?: string }
): MultiModalRoute[] {
  const distance = calculateDistance(start.lat, start.lng, end.lat, end.lng);
  
  // Only offer trains for distances > 50km
  if (distance < 50) {
    return [];
  }

  const routes: MultiModalRoute[] = [];
  
  // Express train
  routes.push({
    mode: 'train',
    mode_icon: '🚄',
    provider: 'Express Rail',
    departure_time: '08:30',
    arrival_time: calculateArrivalTime('08:30', distance * 0.8), // ~80 km/h avg
    duration_minutes: Math.round((distance / 80) * 60),
    distance_km: Math.round(distance * 1.1), // Rail routes ~10% longer
    stops: Math.floor(distance / 100),
    cost_range: {
      min: Math.round(distance * 0.3),
      max: Math.round(distance * 0.5),
      currency: 'USD',
    },
    route_info: `Express train with ${Math.floor(distance / 100)} stops`,
    is_available: true,
  });

  // Local train (if distance < 300km)
  if (distance < 300) {
    routes.push({
      mode: 'train',
      mode_icon: '🚆',
      provider: 'Local Rail',
      departure_time: '09:15',
      arrival_time: calculateArrivalTime('09:15', distance * 1.5), // ~50 km/h avg
      duration_minutes: Math.round((distance / 50) * 60),
      distance_km: Math.round(distance * 1.15),
      stops: Math.floor(distance / 30) + 2,
      cost_range: {
        min: Math.round(distance * 0.15),
        max: Math.round(distance * 0.25),
        currency: 'USD',
      },
      route_info: `Local train with ${Math.floor(distance / 30) + 2} stops`,
      is_available: true,
    });
  }

  return routes;
}

// Simulate flight routes
export function simulateFlightRoutes(
  start: { lat: number; lng: number; label?: string },
  end: { lat: number; lng: number; label?: string }
): MultiModalRoute[] {
  const distance = calculateDistance(start.lat, start.lng, end.lat, end.lng);
  
  // Only offer flights for distances > 200km
  if (distance < 200) {
    return [];
  }

  const routes: MultiModalRoute[] = [];
  
  // Direct flight
  routes.push({
    mode: 'flight',
    mode_icon: '✈️',
    provider: 'Sky Airways',
    departure_time: '10:00',
    arrival_time: calculateArrivalTime('10:00', distance * 0.15), // ~700 km/h cruise + taxi
    duration_minutes: Math.round((distance / 700) * 60) + 45, // +45 min for taxi/takeoff/landing
    distance_km: Math.round(distance),
    stops: 0,
    cost_range: {
      min: Math.round(distance * 0.8 + 50),
      max: Math.round(distance * 1.5 + 150),
      currency: 'USD',
    },
    route_info: 'Direct flight',
    is_available: true,
  });

  // Economy airline (if distance > 500km)
  if (distance > 500) {
    routes.push({
      mode: 'flight',
      mode_icon: '🛫',
      provider: 'Budget Air',
      departure_time: '14:30',
      arrival_time: calculateArrivalTime('14:30', distance * 0.15),
      duration_minutes: Math.round((distance / 650) * 60) + 50,
      distance_km: Math.round(distance),
      stops: 0,
      cost_range: {
        min: Math.round(distance * 0.4 + 30),
        max: Math.round(distance * 0.8 + 80),
        currency: 'USD',
      },
      route_info: 'Economy flight',
      is_available: true,
    });
  }

  // Connecting flight (for very long distances)
  if (distance > 800) {
    routes.push({
      mode: 'flight',
      mode_icon: '🛬',
      provider: 'Global Connect',
      departure_time: '06:00',
      arrival_time: calculateArrivalTime('06:00', distance * 0.2 + 120),
      duration_minutes: Math.round((distance / 600) * 60) + 90, // +90 min for connection
      distance_km: Math.round(distance * 1.05),
      stops: 1,
      cost_range: {
        min: Math.round(distance * 0.5 + 40),
        max: Math.round(distance * 1.0 + 100),
        currency: 'USD',
      },
      route_info: '1 stop connection',
      is_available: true,
    });
  }

  return routes;
}

// Helper to calculate arrival time
function calculateArrivalTime(departureTime: string, durationMinutes: number): string {
  const [hours, minutes] = departureTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const arrivalHours = Math.floor(totalMinutes / 60) % 24;
  const arrivalMinutes = totalMinutes % 60;
  return `${String(arrivalHours).padStart(2, '0')}:${String(arrivalMinutes).padStart(2, '0')}`;
}

// Get all routes for selected mode
export function getMultiModalRoutes(
  start: { lat: number; lng: number; label?: string },
  end: { lat: number; lng: number; label?: string },
  mode: TravelMode
): MultiModalRoute[] {
  if (mode === 'all') {
    return [
      ...simulateTrainRoutes(start, end),
      ...simulateFlightRoutes(start, end),
    ];
  } else if (mode === 'train') {
    return simulateTrainRoutes(start, end);
  } else if (mode === 'flight') {
    return simulateFlightRoutes(start, end);
  }
  return []; // Road routes are fetched via OSRM API separately
}
