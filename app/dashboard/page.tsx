"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle, TrendingUp } from "lucide-react";
import { getOrCreateUserId } from "@/app/lib/user-utils";
import { SAMPLE_ROUTES } from "@/app/lib/simulated-data";
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
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null);
  const [osintZones, setOSINTZones] = useState<OSINTZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulatingDelay, setSimulatingDelay] = useState(false);
  const [osintOverlayVisible, setOSINTOverlayVisible] = useState(true);

  useEffect(() => {
    const id = getOrCreateUserId();
    setUserId(id);
    fetchRoutesAndOSINT();
  }, []);

  async function fetchRoutesAndOSINT() {
    setLoading(true);
    try {
      const [routesRes, osintRes] = await Promise.all([
        fetch("/api/routes/get"),
        fetch("/api/osint/zones"),
      ]);

      const routesData = await routesRes.json();
      setRoutes(routesData.routes);
      setSelectedRoute(routesData.recommendedRoute);

      const osintData = await osintRes.json();
      setOSINTZones(osintData.zones);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
    setLoading(false);
  }

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
            {/* Leaflet Map */}
            <Suspense
              fallback={
                <div className="bg-zinc-100 rounded-lg h-96 flex items-center justify-center border border-zinc-200 text-zinc-500">
                  Loading map...
                </div>
              }
            >
              <LeafletMap
                routes={selectedRoute ? [selectedRoute] : []}
                osintZones={osintZones}
                showOSINT={osintOverlayVisible}
                highlightedRouteId={selectedRoute?.id}
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

            {/* Demo Controls */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-zinc-900">Demo Interactions</h3>
              <button
                onClick={simulateDelayEvent}
                disabled={simulatingDelay}
                className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {simulatingDelay ? "Simulating..." : "Simulate Delay Event"}
              </button>
              <button
                onClick={fetchRoutesAndOSINT}
                className="w-full bg-zinc-200 text-zinc-900 px-4 py-2 rounded-lg font-medium hover:bg-zinc-300 transition-colors"
              >
                Refresh Data
              </button>
            </div>
          </div>

          {/* Right: Route Comparison */}
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold text-lg text-zinc-900 mb-4">Available Routes</h2>
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-8 text-zinc-500">Loading routes...</div>
                ) : (
                  routes.map((route) => (
                    <div
                      key={route.id}
                      onClick={() => setSelectedRoute(route)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedRoute?.id === route.id
                          ? "border-zinc-900 bg-zinc-50"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-zinc-900 text-sm">{route.name}</h3>
                        {selectedRoute?.id === route.id && (
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
                          <span className="font-medium">{route.baseEta} min</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Crowd Level:</span>
                          <span className="font-medium">{Math.round(route.crowdLevel)}%</span>
                        </div>
                        {route.osintPenalty && route.osintPenalty > 0 && (
                          <div className="flex justify-between text-orange-600">
                            <span>OSINT Penalty:</span>
                            <span className="font-medium">{(route.osintPenalty * 100).toFixed(0)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Selected Route Details */}
            {selectedRoute && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 space-y-4">
                <h3 className="font-semibold text-zinc-900">Route Confidence</h3>

                {/* RCI Score */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-600">Confidence Index (RCI)</span>
                    <span
                      className={`font-bold text-lg ${
                        selectedRoute.rciScore > 0.7
                          ? "text-green-600"
                          : selectedRoute.rciScore > 0.5
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {(selectedRoute.rciScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        selectedRoute.rciScore > 0.7
                          ? "bg-green-600"
                          : selectedRoute.rciScore > 0.5
                          ? "bg-yellow-600"
                          : "bg-red-600"
                      }`}
                      style={{ width: `${selectedRoute.rciScore * 100}%` }}
                    />
                  </div>
                  {selectedRoute.originalRCI && selectedRoute.osintPenalty && selectedRoute.osintPenalty > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Original RCI: {(selectedRoute.originalRCI * 100).toFixed(0)}% → Adjusted for OSINT context
                    </p>
                  )}
                </div>

                {/* Failure Risk */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-zinc-600">Failure Risk</span>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${getRiskColor(selectedRoute.failureScore)}`}
                    >
                      {getRiskLevel(selectedRoute.failureScore)}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        selectedRoute.failureScore > 0.5
                          ? "bg-red-600"
                          : selectedRoute.failureScore > 0.3
                          ? "bg-yellow-600"
                          : "bg-green-600"
                      }`}
                      style={{ width: `${selectedRoute.failureScore * 100}%` }}
                    />
                  </div>
                </div>

                {/* OSINT Affected Zones */}
                {selectedRoute.osintAffectedZones && selectedRoute.osintAffectedZones.length > 0 && (
                  <div className="pt-3 border-t border-zinc-200 bg-orange-50 p-3 rounded">
                    <p className="text-xs font-semibold text-orange-900 mb-2">⚠️ OSINT Zones on Route:</p>
                    <ul className="text-xs text-orange-800 space-y-1">
                      {selectedRoute.osintAffectedZones.map((zone) => (
                        <li key={zone.id}>
                          • {zone.type.replace(/_/g, " ")} (Severity: {Math.ceil(zone.severity)}/5)
                        </li>
                      ))}
                    </ul>
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
          </div>
        </div>
      </div>
    </div>
  );
}
