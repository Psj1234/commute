"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle, TrendingUp } from "lucide-react";
import { getOrCreateUserId } from "@/app/lib/user-utils";

// NEW: Import multi-modal routing
import { getMultiModalRoutes, MultiModalRoute, TravelMode } from "@/app/lib/multi-modal-routes";

import dynamic from "next/dynamic";
import OSINTOverlayRenderer from "@/app/components/OSINTOverlayRenderer";

// Dynamically import Leaflet component to avoid SSR issues
const LeafletMap = dynamic(() => import("@/app/components/LeafletMap"), {
  ssr: false,
  loading: () => <div className="bg-zinc-100 rounded-lg h-96 flex items-center justify-center border border-zinc-200 text-zinc-500">Loading map...</div>,
});

interface RouteData {
  id: string;
  name: string;
  distance: number;
  baseEta: number;
  rciScore: number;
  originalRCI?: number;
  osintPenalty?: number;
  osintAffectedZones?: Array<{ id: string; type: string; severity: number }>;
  failureScore: number;
  crowdLevel: number;
  geometry: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
}

interface OSINTZone {
  id: string;
  zone_type: string;
  severity: number;
  center_lat: number;
  center_lng: number;
  radius_km: number;
  description: string;
  time_window_start: string;
  time_window_end: string;
  decay_factor: number;
  is_active: boolean;
}

export default function Dashboard() {
  const [userId, setUserId] = useState<string>("");
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null);
  const [osintZones, setOSINTZones] = useState<OSINTZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [simulatingDelay, setSimulatingDelay] = useState(false);
  const [osintOverlayVisible, setOSINTOverlayVisible] = useState(true);
  const [startLocation, setStartLocation] = useState<{ lat: number; lng: number; label?: string } | null>(null);
  const [endLocation, setEndLocation] = useState<{ lat: number; lng: number; label?: string } | null>(null);
  const [routeExplanations, setRouteExplanations] = useState<{ [route_id: string]: string }>({});
  
  // NEW: Text-based location search state
  const [startSearchQuery, setStartSearchQuery] = useState("");
  const [endSearchQuery, setEndSearchQuery] = useState("");
  const [startSearchResults, setStartSearchResults] = useState<Array<{ lat: number; lng: number; label: string }>>([]);
  const [endSearchResults, setEndSearchResults] = useState<Array<{ lat: number; lng: number; label: string }>>([]);
  const [searchingStart, setSearchingStart] = useState(false);
  const [searchingEnd, setSearchingEnd] = useState(false);
  
  // NEW: Navigation steps state
  const [showNavigationSteps, setShowNavigationSteps] = useState(false);
  const [navigationSteps, setNavigationSteps] = useState<any[]>([]);
  const [highlightedStepIndex, setHighlightedStepIndex] = useState<number | undefined>(undefined); // NEW: For map sync
  
  // NEW: Multi-modal state
  const [travelMode, setTravelMode] = useState<TravelMode>('all');
  const [multiModalRoutes, setMultiModalRoutes] = useState<MultiModalRoute[]>([]);
  const [selectedMultiModalRoute, setSelectedMultiModalRoute] = useState<MultiModalRoute | null>(null);

  useEffect(() => {
    const id = getOrCreateUserId();
    setUserId(id);
    // Optionally, fetch OSINT overlays on load
    fetch("/api/osint/zones").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setOSINTZones(data.zones);
      }
    });
  }, []);

  // Fetch routes when both start and end are set
  useEffect(() => {
    if (!startLocation || !endLocation) return;
    
    // Clear previous routes immediately
    setRoutes([]);
    setSelectedRoute(null);
    setRouteExplanations({});
    setMultiModalRoutes([]); // NEW: Clear multi-modal routes
    setSelectedMultiModalRoute(null); // NEW
    setLoading(true);
    
    // NEW: Fetch multi-modal routes (train/flight) if not road-only mode
    if (travelMode !== 'road') {
      const altRoutes = getMultiModalRoutes(startLocation, endLocation, travelMode);
      setMultiModalRoutes(altRoutes);
    }
    
    // Fetch road routes if mode is 'road' or 'all'
    if (travelMode === 'road' || travelMode === 'all') {
      fetch("/api/routes/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start: startLocation, end: endLocation, userId }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch routes");
        const data = await res.json();
        setRoutes(data.routes);
        // Find most reliable (highest RCI)
        let bestRCI = -1;
        let bestRoute = null;
        data.routes.forEach((r: any) => {
          if (r.rci > bestRCI) {
            bestRCI = r.rci;
            bestRoute = r;
          }
        });
        // Prefer Maps preferred, else best RCI
        const mapsPreferred = data.routes.find((r: any) => r.is_maps_preferred);
        setSelectedRoute(mapsPreferred || bestRoute || data.routes[0]);
        // NEW: Set navigation steps for selected route
        const selected = mapsPreferred || bestRoute || data.routes[0];
        setNavigationSteps(selected?.steps || []);
        // Save explanations for each route
        const explanations: { [route_id: string]: string } = {};
        data.routes.forEach((r: any) => { explanations[r.route_id] = r.explanation; });
        setRouteExplanations(explanations);
      })
      .catch((err) => {
        console.error("Route fetch error:", err);
        setRoutes([]);
        setSelectedRoute(null);
        setRouteExplanations({});
      })
      .finally(() => setLoading(false));
    } else {
      // If not fetching road routes, loading is done after multi-modal fetch
      setLoading(false);
    }
  }, [startLocation, endLocation, userId, travelMode]); // NEW: Added travelMode dependency

  function simulateDelayEvent() {
    setSimulatingDelay(true);
    setTimeout(() => {
      const updated = routes.map((r) => ({
        ...r,
        failureScore: r.failureScore + 0.15,
      }));
      setRoutes(updated);
      setSimulatingDelay(false);
    }, 1500);
  }

  // NEW: Forward geocode search function
  async function searchLocation(query: string, type: "start" | "end") {
    if (query.trim().length < 3) {
      if (type === "start") setStartSearchResults([]);
      else setEndSearchResults([]);
      return;
    }

    if (type === "start") setSearchingStart(true);
    else setSearchingEnd(true);

    try {
      const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      
      if (res.ok && data.results) {
        if (type === "start") setStartSearchResults(data.results);
        else setEndSearchResults(data.results);
      } else {
        if (type === "start") setStartSearchResults([]);
        else setEndSearchResults([]);
      }
    } catch (err) {
      console.error("Search error:", err);
      if (type === "start") setStartSearchResults([]);
      else setEndSearchResults([]);
    } finally {
      if (type === "start") setSearchingStart(false);
      else setSearchingEnd(false);
    }
  }

  // NEW: Handle selecting a search result
  function selectSearchResult(result: { lat: number; lng: number; label: string }, type: "start" | "end") {
    if (type === "start") {
      setStartLocation({ lat: result.lat, lng: result.lng, label: result.label });
      setStartSearchQuery(result.label);
      setStartSearchResults([]);
    } else {
      setEndLocation({ lat: result.lat, lng: result.lng, label: result.label });
      setEndSearchQuery(result.label);
      setEndSearchResults([]);
    }
  }

  function getRiskLevel(failureScore: number): string {
    if (failureScore > 0.5) return "High";
    if (failureScore > 0.3) return "Medium";
    return "Low";
  }

  function getRiskColor(failureScore: number): string {
    if (failureScore > 0.5) return "text-red-600 bg-red-50";
    if (failureScore > 0.3) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  }

  // NEW: Format navigation instruction from OSRM maneuver
  function formatNavigationInstruction(step: any): string {
    const { instruction, modifier, name } = step;
    
    const actions: { [key: string]: string } = {
      'depart': 'Start',
      'arrive': 'Arrive at destination',
      'turn': modifier ? `Turn ${modifier}` : 'Turn',
      'new name': 'Continue',
      'continue': 'Continue',
      'merge': modifier ? `Merge ${modifier}` : 'Merge',
      'on ramp': 'Take the ramp',
      'off ramp': 'Take the exit',
      'fork': modifier ? `Take the ${modifier} fork` : 'At the fork',
      'end of road': modifier ? `At the end, turn ${modifier}` : 'At the end of road',
      'roundabout': 'Enter the roundabout',
      'rotary': 'Enter the rotary',
      'roundabout turn': modifier ? `At roundabout, take ${modifier} exit` : 'Exit the roundabout',
    };

    const action = actions[instruction] || 'Continue';
    const roadName = name && name !== 'unnamed road' ? ` onto ${name}` : '';
    
    return `${action}${roadName}`;
  }

  // NEW: Format distance
  function formatDistance(meters: number): string {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900">
            <ArrowLeft size={18} />
            <span className="text-sm">Back</span>
          </Link>
          <h1 className="font-semibold text-lg text-zinc-900">Dashboard</h1>
          <div className="text-sm text-zinc-500">User: {userId?.slice(0, 8)}...</div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Map & OSINT Overlays */}
          <div className="lg:col-span-2 space-y-6">
            {/* NEW: Text-based location search inputs */}
            <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-sm text-zinc-900">Search Locations</h3>
              
              {/* Start Location Search */}
              <div className="relative">
                <label className="block text-xs text-zinc-600 mb-1">Start Location</label>
                <input
                  type="text"
                  placeholder="Type address or place name..."
                  value={startSearchQuery}
                  onChange={(e) => {
                    setStartSearchQuery(e.target.value);
                    searchLocation(e.target.value, "start");
                  }}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                />
                {searchingStart && (
                  <div className="absolute right-3 top-8 text-xs text-zinc-500">Searching...</div>
                )}
                {startSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {startSearchResults.map((result, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectSearchResult(result, "start")}
                        className="px-3 py-2 hover:bg-zinc-100 cursor-pointer text-xs text-zinc-700 border-b border-zinc-100 last:border-b-0"
                      >
                        📍 {result.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* End Location Search */}
              <div className="relative">
                <label className="block text-xs text-zinc-600 mb-1">Destination</label>
                <input
                  type="text"
                  placeholder="Type address or place name..."
                  value={endSearchQuery}
                  onChange={(e) => {
                    setEndSearchQuery(e.target.value);
                    searchLocation(e.target.value, "end");
                  }}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                />
                {searchingEnd && (
                  <div className="absolute right-3 top-8 text-xs text-zinc-500">Searching...</div>
                )}
                {endSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {endSearchResults.map((result, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectSearchResult(result, "end")}
                        className="px-3 py-2 hover:bg-zinc-100 cursor-pointer text-xs text-zinc-700 border-b border-zinc-100 last:border-b-0"
                      >
                        🎯 {result.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-zinc-500">Or click on the map to select locations</p>
            </div>

            {/* NEW: Travel Mode Selector */}
            <div className="bg-white border border-zinc-200 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-zinc-900 mb-3">Travel Mode</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setTravelMode('all')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    travelMode === 'all'
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  🌐 All Modes
                </button>
                <button
                  onClick={() => setTravelMode('road')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    travelMode === 'road'
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  🚗 Road
                </button>
                <button
                  onClick={() => setTravelMode('train')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    travelMode === 'train'
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  🚆 Train
                </button>
                <button
                  onClick={() => setTravelMode('flight')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    travelMode === 'flight'
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  ✈️ Flight
                </button>
              </div>
            </div>

            {/* Leaflet Map */}
            <Suspense
              fallback={
                <div className="bg-zinc-100 rounded-lg h-96 flex items-center justify-center border border-zinc-200 text-zinc-500">
                  Loading map...
                </div>
              }
            >
              <LeafletMap
                routes={routes.map((r) => ({
                  id: r.route_id || r.id || "",
                  name: r.name || "Route",
                  start_lat: startLocation?.lat ?? 0,
                  start_lng: startLocation?.lng ?? 0,
                  end_lat: endLocation?.lat ?? 0,
                  end_lng: endLocation?.lng ?? 0,
                  geometry: typeof r.geometry === "string" ? r.geometry : JSON.stringify(r.geometry ?? {}),
                  steps: r.steps, // NEW: Pass steps to map
                }))}
                osintZones={osintZones}
                showOSINT={osintOverlayVisible}
                highlightedRouteId={selectedRoute?.route_id}
                highlightedStepIndex={highlightedStepIndex} // NEW: Pass highlighted step
                onStepClick={(stepIdx) => { // NEW: Handle step click from map
                  setHighlightedStepIndex(stepIdx);
                  setShowNavigationSteps(true);
                  // Scroll to step in list
                  setTimeout(() => {
                    const stepElement = document.getElementById(`step-${stepIdx}`);
                    stepElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                }}
                onLocationSelect={(lat, lng, type) => {
                  if (type === "start") {
                    setStartLocation({ lat, lng });
                    // Reverse geocode start
                    fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`)
                      .then(res => res.json())
                      .then(data => {
                        setStartLocation(loc => ({ ...loc!, label: data.label || `${lat.toFixed(5)}, ${lng.toFixed(5)}` }));
                      })
                      .catch(() => {
                        setStartLocation(loc => ({ ...loc!, label: `${lat.toFixed(5)}, ${lng.toFixed(5)}` }));
                      });
                  } else if (type === "end") {
                    setEndLocation({ lat, lng });
                    // Reverse geocode end
                    fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`)
                      .then(res => res.json())
                      .then(data => {
                        setEndLocation(loc => ({ ...loc!, label: data.label || `${lat.toFixed(5)}, ${lng.toFixed(5)}` }));
                      })
                      .catch(() => {
                        setEndLocation(loc => ({ ...loc!, label: `${lat.toFixed(5)}, ${lng.toFixed(5)}` }));
                      });
                  } else if (type === "reset") {
                    setStartLocation(null);
                    setEndLocation(null);
                    setRoutes([]);
                    setSelectedRoute(null);
                  }
                }}
              />
            </Suspense>

            {/* OSINT Overlay Renderer */}
            {osintZones.length > 0 && (
              <OSINTOverlayRenderer
                zones={osintZones}
                visible={osintOverlayVisible}
                onToggle={setOSINTOverlayVisible}
              />
            )}

            {/* Human-readable label display below map */}
            <div className="mt-2 px-4 text-xs text-gray-700">
              {startLocation?.label && (
                <div>Start: 📍 {startLocation.label}</div>
              )}
              {endLocation?.label && (
                <div>End: 🎯 {endLocation.label}</div>
              )}
            </div>

            {/* Demo Controls (disabled for real routes) */}
            {/* ...existing code... */}
          </div>

          {/* Right: Route Comparison */}
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold text-lg text-zinc-900 mb-4">Available Routes</h2>
              
              {/* NEW: Route Comparison Banner */}
              {!loading && routes.length >= 2 && (
                <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-indigo-300 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🧠</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-indigo-900 mb-1">Intelligence Recommendation</h3>
                      <p className="text-sm text-indigo-700 leading-relaxed">
                        Route sorted by <strong>reliability</strong>, not speed. The most reliable route is shown first, 
                        even if it's slower. This prioritizes on-time arrivals over fastest ETA.
                      </p>
                      {routes[0] && routes[1] && (
                        <div className="mt-3 p-3 bg-white rounded border border-indigo-200">
                          <div className="text-xs space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-zinc-700">Most Reliable:</span>
                              <span className={`font-bold ${
                                routes[0].rci >= 0.75 ? 'text-green-600' : 
                                routes[0].rci >= 0.55 ? 'text-yellow-600' : 
                                'text-red-600'
                              }`}>
                                Route 1 ({(routes[0].rci * 100).toFixed(0)}% RCI)
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-zinc-700">ETA Difference:</span>
                              <span className="text-zinc-600">
                                {Math.abs((routes[0].base_eta || Math.round(routes[0].duration / 60)) - 
                                         (routes[1].base_eta || Math.round(routes[1].duration / 60)))} min
                                {(routes[0].base_eta || Math.round(routes[0].duration / 60)) > 
                                 (routes[1].base_eta || Math.round(routes[1].duration / 60)) 
                                  ? ' slower' : ' faster'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-zinc-700">Reliability Gain:</span>
                              <span className="text-green-600 font-semibold">
                                +{((routes[0].rci - routes[1].rci) * 100).toFixed(0)}% more reliable
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-8 text-zinc-500">Loading routes...</div>
                ) : (
                  <>
                    {/* Road Routes */}
                    {routes.length > 0 && routes.map((route, routeIndex) => {
                      // Find best RCI
                      const bestRCI = Math.max(...routes.map(r => r.rci));
                      const isBestRCI = route.rci === bestRCI;
                      return (
                        <div
                          key={route.route_id}
                          onClick={() => {
                            setSelectedRoute(route);
                            setNavigationSteps(route.steps || []);
                            setSelectedMultiModalRoute(null); // NEW: Clear multi-modal selection
                          }}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedRoute?.route_id === route.route_id
                              ? "border-zinc-900 bg-zinc-50"
                              : "border-zinc-200 hover:border-zinc-300"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🚗</span>
                              <h3 className="font-semibold text-zinc-900 text-sm">{route.name || "Route"}</h3>
                              {route.is_maps_preferred && (
                                <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Maps Preferred</span>
                              )}
                              {isBestRCI && (
                                <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">Most Reliable</span>
                              )}
                            </div>
                            {selectedRoute?.route_id === route.route_id && (
                              <span className="text-xs bg-zinc-900 text-white px-2 py-1 rounded">
                                Selected
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 text-xs text-zinc-600">
                            <div className="flex justify-between">
                              <span>Distance:</span>
                              <span className="font-medium">{route.distance} km</span>
                            </div>
                            <div className="flex justify-between">
                              <span>ETA:</span>
                              <span className="font-medium">{route.base_eta || Math.round((route.duration || 0) / 60)} min</span>
                            </div>
                            
                            {/* NEW: Enhanced RCI Display with Confidence Level */}
                            <div className="mt-2 p-2 rounded bg-zinc-100 border border-zinc-300">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold text-zinc-800">Reliability Score:</span>
                                <span className={`font-bold text-lg ${
                                  route.rci >= 0.75 ? 'text-green-600' : 
                                  route.rci >= 0.55 ? 'text-yellow-600' : 
                                  'text-red-600'
                                }`}>
                                  {(route.rci * 100).toFixed(0)}%
                                </span>
                              </div>
                              {route.confidence_level && (
                                <div className="flex justify-between items-center">
                                  <span className="text-xs">Confidence:</span>
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                    route.confidence_level === 'HIGH' ? 'bg-green-200 text-green-800' :
                                    route.confidence_level === 'MEDIUM' ? 'bg-yellow-200 text-yellow-800' :
                                    'bg-red-200 text-red-800'
                                  }`}>
                                    {route.confidence_level}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* NEW: Show penalties/bonuses if significant */}
                            {(route.failure_penalty > 0.05 || route.time_window_penalty > 0.05 || 
                              route.osint_penalty > 0.05 || route.persona_bonus > 0.05) && (
                              <div className="mt-2 space-y-1 text-[10px] text-zinc-500">
                                {route.failure_penalty > 0.05 && (
                                  <div className="flex justify-between">
                                    <span>⚠️ Failure History:</span>
                                    <span className="text-red-600">-{(route.failure_penalty * 100).toFixed(0)}%</span>
                                  </div>
                                )}
                                {route.time_window_penalty > 0.05 && (
                                  <div className="flex justify-between">
                                    <span>⏰ Time Window:</span>
                                    <span className="text-orange-600">-{(route.time_window_penalty * 100).toFixed(0)}%</span>
                                  </div>
                                )}
                                {route.osint_penalty > 0.05 && (
                                  <div className="flex justify-between">
                                    <span>🔴 Advisory Zones:</span>
                                    <span className="text-red-600">-{(route.osint_penalty * 100).toFixed(0)}%</span>
                                  </div>
                                )}
                                {route.persona_bonus > 0.05 && (
                                  <div className="flex justify-between">
                                    <span>👤 Persona Match:</span>
                                    <span className="text-green-600">+{(route.persona_bonus * 100).toFixed(0)}%</span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Explanation */}
                            {route.explanation && (
                              <div className="text-xs text-blue-700 mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                {route.explanation}
                              </div>
                            )}
                            
                            {/* NEW: Risk Factors */}
                            {route.risk_factors && route.risk_factors.length > 0 && (
                              <details className="mt-2">
                                <summary className="text-xs cursor-pointer text-zinc-700 font-medium">
                                  📋 Risk Factors ({route.risk_factors.length})
                                </summary>
                                <div className="mt-1 space-y-1 text-[10px] text-zinc-600 ml-4">
                                  {route.risk_factors.map((factor: string, idx: number) => (
                                    <div key={idx}>• {factor}</div>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* NEW: Multi-Modal Routes (Train & Flight) */}
                    {multiModalRoutes.length > 0 && multiModalRoutes.map((route, idx) => (
                      <div
                        key={`${route.mode}-${idx}`}
                        onClick={() => {
                          setSelectedMultiModalRoute(route);
                          setSelectedRoute(null); // Clear road route selection
                          setNavigationSteps([]);
                        }}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedMultiModalRoute === route
                            ? "border-zinc-900 bg-zinc-50"
                            : "border-zinc-200 hover:border-zinc-300"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{route.mode_icon}</span>
                            <h3 className="font-semibold text-zinc-900 text-sm capitalize">
                              {route.provider}
                            </h3>
                            <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded capitalize">
                              {route.mode}
                            </span>
                          </div>
                          {selectedMultiModalRoute === route && (
                            <span className="text-xs bg-zinc-900 text-white px-2 py-1 rounded">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-xs text-zinc-600">
                          {route.distance_km && (
                            <div className="flex justify-between">
                              <span>Distance:</span>
                              <span className="font-medium">{route.distance_km} km</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Duration:</span>
                            <span className="font-medium">
                              {Math.floor(route.duration_minutes / 60)}h {route.duration_minutes % 60}m
                            </span>
                          </div>
                          {route.stops !== undefined && (
                            <div className="flex justify-between">
                              <span>Stops:</span>
                              <span className="font-medium">{route.stops}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Cost:</span>
                            <span className="font-medium">
                              ${route.cost_range.min} - ${route.cost_range.max}
                            </span>
                          </div>
                          {route.departure_time && route.arrival_time && (
                            <div className="text-xs text-blue-700 mt-1">
                              🕐 {route.departure_time} → {route.arrival_time}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* No routes message */}
                    {routes.length === 0 && multiModalRoutes.length === 0 && (
                      <div className="text-center py-8 text-zinc-500">
                        No routes available. Try selecting different locations or travel modes.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Selected Route Details */}
            {selectedRoute && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 space-y-4">
                <h3 className="font-semibold text-zinc-900 text-lg">Route Intelligence Analysis</h3>
                
                {/* Main RCI Display */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-600">Reliability Confidence Index (RCI)</span>
                    <span
                      className={`font-bold text-2xl ${
                        selectedRoute.rci >= 0.75
                          ? "text-green-600"
                          : selectedRoute.rci >= 0.55
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {(selectedRoute.rci * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        selectedRoute.rci >= 0.75
                          ? "bg-green-600"
                          : selectedRoute.rci >= 0.55
                          ? "bg-yellow-600"
                          : "bg-red-600"
                      }`}
                      style={{ width: `${selectedRoute.rci * 100}%` }}
                    />
                  </div>
                  
                  {/* Confidence Level Badge */}
                  {selectedRoute.confidence_level && (
                    <div className="flex justify-center pt-2">
                      <span className={`px-4 py-1 rounded-full text-sm font-semibold ${
                        selectedRoute.confidence_level === 'HIGH' 
                          ? 'bg-green-100 text-green-800 border-2 border-green-300' :
                        selectedRoute.confidence_level === 'MEDIUM' 
                          ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300' :
                        'bg-red-100 text-red-800 border-2 border-red-300'
                      }`}>
                        {selectedRoute.confidence_level} CONFIDENCE
                      </span>
                    </div>
                  )}
                  
                  {/* Explanation */}
                  {selectedRoute.explanation && (
                    <div className="text-sm text-blue-900 mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="font-medium mb-1">💡 Why this score?</div>
                      {selectedRoute.explanation}
                    </div>
                  )}
                </div>

                {/* NEW: RCI Component Breakdown */}
                {selectedRoute.original_rci && (
                  <div className="pt-4 border-t border-zinc-300">
                    <details className="group">
                      <summary className="cursor-pointer font-medium text-zinc-800 text-sm hover:text-zinc-900 flex items-center gap-2">
                        <span>📊 Detailed Breakdown</span>
                        <span className="text-xs text-zinc-500 group-open:hidden">(click to expand)</span>
                      </summary>
                      
                      <div className="mt-3 space-y-3">
                        {/* Original vs Adjusted */}
                        <div className="bg-white rounded p-3 text-xs space-y-2">
                          <div className="flex justify-between">
                            <span className="text-zinc-600">Base RCI (before adjustments):</span>
                            <span className="font-medium text-zinc-900">{(selectedRoute.original_rci * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-600">Final RCI (after intelligence):</span>
                            <span className="font-bold text-green-600">{(selectedRoute.rci * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="font-medium text-zinc-700">Net Change:</span>
                            <span className={`font-bold ${
                              (selectedRoute.rci - selectedRoute.original_rci) >= 0 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {(selectedRoute.rci - selectedRoute.original_rci) >= 0 ? '+' : ''}
                              {((selectedRoute.rci - selectedRoute.original_rci) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* Penalties and Bonuses */}
                        <div className="bg-white rounded p-3 text-xs space-y-2">
                          <div className="font-medium text-zinc-800 mb-2">Intelligence Adjustments:</div>
                          {selectedRoute.failure_penalty > 0.001 && (
                            <div className="flex justify-between items-center">
                              <span className="text-red-700">⚠️ Failure History Penalty:</span>
                              <span className="font-medium text-red-600">-{(selectedRoute.failure_penalty * 100).toFixed(1)}%</span>
                            </div>
                          )}
                          {selectedRoute.time_window_penalty > 0.001 && (
                            <div className="flex justify-between items-center">
                              <span className="text-orange-700">⏰ Time Window Penalty:</span>
                              <span className="font-medium text-orange-600">-{(selectedRoute.time_window_penalty * 100).toFixed(1)}%</span>
                            </div>
                          )}
                          {selectedRoute.osint_penalty > 0.001 && (
                            <div className="flex justify-between items-center">
                              <span className="text-red-700">🔴 OSINT Zone Penalty:</span>
                              <span className="font-medium text-red-600">-{(selectedRoute.osint_penalty * 100).toFixed(1)}%</span>
                            </div>
                          )}
                          {selectedRoute.persona_bonus > 0.001 && (
                            <div className="flex justify-between items-center">
                              <span className="text-green-700">👤 Persona Bonus:</span>
                              <span className="font-medium text-green-600">+{(selectedRoute.persona_bonus * 100).toFixed(1)}%</span>
                            </div>
                          )}
                          {selectedRoute.failure_penalty <= 0.001 && 
                           selectedRoute.time_window_penalty <= 0.001 &&
                           selectedRoute.osint_penalty <= 0.001 &&
                           selectedRoute.persona_bonus <= 0.001 && (
                            <div className="text-zinc-500 text-center py-2">
                              ✓ No significant adjustments applied
                            </div>
                          )}
                        </div>

                        {/* Risk Factors */}
                        {selectedRoute.risk_factors && selectedRoute.risk_factors.length > 0 && (
                          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs">
                            <div className="font-medium text-amber-900 mb-2">🚨 Identified Risk Factors:</div>
                            <ul className="space-y-1 text-amber-800">
                              {selectedRoute.risk_factors.map((factor: string, idx: number) => (
                                <li key={idx} className="leading-relaxed">{factor}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                )}

                {/* Navigation Links */}
                <div className="pt-4 space-y-2 border-t border-zinc-200">
                  <Link
                    href="/routes"
                    className="block text-center bg-zinc-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-zinc-800 transition-colors text-sm"
                  >
                    Compare Routes
                  </Link>
                  <Link
                    href="/persona"
                    className="block text-center border border-zinc-300 text-zinc-900 px-4 py-2 rounded-lg font-medium hover:bg-zinc-50 transition-colors text-sm"
                  >
                    View Your Persona
                  </Link>
                </div>
              </div>
            )}

            {/* NEW: Multi-Modal Route Details */}
            {selectedMultiModalRoute && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{selectedMultiModalRoute.mode_icon}</span>
                  <h3 className="font-semibold text-zinc-900">{selectedMultiModalRoute.provider}</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-zinc-500 mb-1">Journey Details</div>
                    <div className="text-sm font-medium text-zinc-900">{selectedMultiModalRoute.route_info}</div>
                  </div>

                  {selectedMultiModalRoute.departure_time && selectedMultiModalRoute.arrival_time && (
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-xs text-zinc-500 mb-2">Schedule</div>
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <div className="font-medium text-zinc-900">
                            🕐 {selectedMultiModalRoute.departure_time}
                          </div>
                          <div className="text-xs text-zinc-500">Departure</div>
                        </div>
                        <div className="text-zinc-400">→</div>
                        <div>
                          <div className="font-medium text-zinc-900">
                            🕐 {selectedMultiModalRoute.arrival_time}
                          </div>
                          <div className="text-xs text-zinc-500">Arrival</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-xs text-zinc-500 mb-1">Duration</div>
                      <div className="text-sm font-medium text-zinc-900">
                        {Math.floor(selectedMultiModalRoute.duration_minutes / 60)}h{' '}
                        {selectedMultiModalRoute.duration_minutes % 60}m
                      </div>
                    </div>

                    {selectedMultiModalRoute.distance_km && (
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-xs text-zinc-500 mb-1">Distance</div>
                        <div className="text-sm font-medium text-zinc-900">
                          {selectedMultiModalRoute.distance_km} km
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {selectedMultiModalRoute.stops !== undefined && (
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-xs text-zinc-500 mb-1">Stops</div>
                        <div className="text-sm font-medium text-zinc-900">
                          {selectedMultiModalRoute.stops === 0 ? 'Non-stop' : selectedMultiModalRoute.stops}
                        </div>
                      </div>
                    )}

                    <div className="bg-white rounded-lg p-3">
                      <div className="text-xs text-zinc-500 mb-1">Est. Cost</div>
                      <div className="text-sm font-medium text-zinc-900">
                        ${selectedMultiModalRoute.cost_range.min} - ${selectedMultiModalRoute.cost_range.max}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-xs text-blue-900 font-medium mb-1">ℹ️ Travel Mode</div>
                    <div className="text-xs text-blue-800 capitalize">
                      {selectedMultiModalRoute.mode} travel • {selectedMultiModalRoute.is_available ? 'Available' : 'Not available'}
                    </div>
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="pt-4 space-y-2 border-t border-zinc-200">
                  <Link
                    href="/routes"
                    className="block text-center bg-zinc-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-zinc-800 transition-colors text-sm"
                  >
                    Compare All Routes
                  </Link>
                </div>
              </div>
            )}

            {/* NEW: Turn-by-Turn Navigation Instructions */}
            {selectedRoute && navigationSteps.length > 0 && (
              <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowNavigationSteps(!showNavigationSteps)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🧭</span>
                    <h3 className="font-semibold text-zinc-900">Navigation Instructions</h3>
                    <span className="text-xs text-zinc-500">({navigationSteps.length} steps)</span>
                  </div>
                  <span className={`transform transition-transform ${showNavigationSteps ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>

                {showNavigationSteps && (
                  <div className="border-t border-zinc-200 max-h-96 overflow-y-auto">
                    <div className="divide-y divide-zinc-100">
                      {navigationSteps.map((step, idx) => (
                        <div
                          key={idx}
                          id={`step-${idx}`}
                          onClick={() => {
                            setHighlightedStepIndex(idx);
                            // Optionally zoom to this step on map (would need map ref)
                          }}
                          className={`px-6 py-3 transition-colors flex items-start gap-3 cursor-pointer ${
                            highlightedStepIndex === idx 
                              ? 'bg-yellow-50 border-l-4 border-yellow-500' 
                              : 'hover:bg-zinc-50'
                          }`}
                        >
                          {/* Step Number */}
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-semibold mt-0.5 ${
                            highlightedStepIndex === idx ? 'bg-yellow-500' : 'bg-zinc-900'
                          }`}>
                            {step.step_number}
                          </div>

                          {/* Instruction Details */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${
                              highlightedStepIndex === idx ? 'text-yellow-900' : 'text-zinc-900'
                            }`}>
                              {formatNavigationInstruction(step)}
                            </p>
                            {step.distance > 0 && (
                              <p className="text-xs text-zinc-500 mt-1">
                                Continue for {formatDistance(step.distance)}
                                {step.duration > 0 && (
                                  <span className="ml-2">
                                    • {Math.round(step.duration / 60)} min
                                  </span>
                                )}
                              </p>
                            )}
                          </div>

                          {/* Direction Icon */}
                          <div className="flex-shrink-0 text-zinc-400">
                            {step.instruction === 'turn' && step.modifier?.includes('left') && '↰'}
                            {step.instruction === 'turn' && step.modifier?.includes('right') && '↱'}
                            {step.instruction === 'continue' && '↑'}
                            {step.instruction === 'arrive' && '🎯'}
                            {step.instruction === 'depart' && '🚀'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
