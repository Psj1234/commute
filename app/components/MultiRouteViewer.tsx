"use client";

import React, { useState, useEffect } from "react";
import { getModeEmoji, getTrafficSignal, getSignalDescription, getAndheriToCSTPRoutes, MUMBAI_STATIONS } from "@/app/lib/traffic-intelligence";
import { rankRoutesByPersona, PERSONA_PROFILES, type PersonaType } from "@/app/lib/persona-traffic-ranker";

interface MultiRouteViewerProps {
  initialPersona?: PersonaType;
  initialTime?: string;
  initialStart?: string;
  initialEnd?: string;
  onPersonaChange?: (persona: PersonaType) => void;
}

interface RouteOption {
  route_id: string;
  name: string;
  mode_types: string;
  segments_count: number;
  distance_km: number;
  base_eta_min: number;
  persona_score: number;
  overall_signal: string;
  explanation: string;
  segments: {
    name: string;
    mode: string;
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
  }[];
}

export default function MultiRouteViewer({
  initialPersona = "SAFE_PLANNER",
  initialTime = "09:30",
  initialStart = "Andheri",
  initialEnd = "CST",
  onPersonaChange,
}: MultiRouteViewerProps) {
  const [persona, setPersona] = useState<PersonaType>(initialPersona);
  const [time, setTime] = useState(initialTime);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

  const stationLookup = Object.values(MUMBAI_STATIONS);

  const getStationNameFromCoords = (lat: number, lng: number): string | null => {
    const match = stationLookup.find(
      (station) => Math.abs(station.lat - lat) <= 0.005 && Math.abs(station.lng - lng) <= 0.005
    );
    return match ? match.name : null;
  };

  const formatCoordinate = (value: number) => value.toFixed(4);

  // Load and process routes
  useEffect(() => {
    setLoading(true);

    // Fetch from API
    const params = new URLSearchParams({
      persona,
      time,
      start,
      end,
    });

    fetch(`/api/routes/personalized?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.routes) {
          const routeOptions: RouteOption[] = data.routes.map((route: any) => {
            const modes = route.segments
              .map((seg: any) => getModeEmoji(seg.mode))
              .join(" → ");
            return {
              route_id: route.id,
              name: route.name,
              mode_types: modes,
              segments_count: route.segments.length,
              distance_km: route.total_distance_km,
              base_eta_min: route.total_base_eta_min,
              persona_score: route.persona_score,
              overall_signal: getOverallSignal(route.segments),
              explanation: route.explanation,
              segments: route.segments,
            };
          });
          setRoutes(routeOptions);
          if (routeOptions.length > 0) {
            setSelectedRoute(routeOptions[0].route_id);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch routes:", err);
        setLoading(false);
      });
  }, [persona, time, start, end]);

  // Calculate overall signal for route
  const getOverallSignal = (segments: any[]) => {
    const avgTraffic = segments.reduce((sum, s) => sum + s.traffic_density, 0) / segments.length;
    const avgCrowd = segments.reduce((sum, s) => sum + s.crowd_score, 0) / segments.length;
    return getTrafficSignal(avgTraffic, avgCrowd);
  };

  // Handle persona change
  const handlePersonaChange = (newPersona: PersonaType) => {
    setPersona(newPersona);
    onPersonaChange?.(newPersona);
  };

  // Handle time change
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTime(e.target.value);
  };

  // Handle start change
  const handleStartChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStart(e.target.value);
  };

  // Handle end change
  const handleEndChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEnd(e.target.value);
  };

  if (loading && routes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin mb-2 text-2xl">⏳</div>
          <p className="text-gray-600">Loading routes...</p>
        </div>
      </div>
    );
  }

  const personaProfile = PERSONA_PROFILES[persona];
  const selectedRouteDetails = routes.find((route) => route.route_id === selectedRoute);
  const selectedPathPoints = selectedRouteDetails
    ? selectedRouteDetails.segments.reduce<{ lat: number; lng: number }[]>((points, seg, idx) => {
        if (idx === 0) {
          points.push(seg.start);
        }
        points.push(seg.end);
        return points;
      }, [])
    : [];
  const selectedPathNames = selectedPathPoints.map((point) => {
    const name = getStationNameFromCoords(point.lat, point.lng);
    return name ?? `${formatCoordinate(point.lat)}, ${formatCoordinate(point.lng)}`;
  });
  const selectedPathCoords = selectedPathPoints.map(
    (point) => `${formatCoordinate(point.lat)}, ${formatCoordinate(point.lng)}`
  );

  return (
    <div className="w-full max-w-5xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          {personaProfile.name} Route Comparison
        </h1>
        <p className="text-gray-600">{personaProfile.description}</p>
      </div>

      {/* Location Selector */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            Start Location
          </label>
          <select
            value={start}
            onChange={handleStartChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="Andheri">📍 Andheri</option>
            <option value="Bandra">📍 Bandra</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            End Location
          </label>
          <select
            value={end}
            onChange={handleEndChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="CST">📍 CST</option>
            <option value="Dadar">📍 Dadar</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            Departure Time
          </label>
          <input
            type="time"
            value={time}
            onChange={handleTimeChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Persona Selector */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <label className="block text-sm font-semibold mb-3 text-gray-700">
          Select Persona
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(
            ["RUSHER", "SAFE_PLANNER", "COMFORT_SEEKER", "EXPLORER"] as PersonaType[]
          ).map((p) => (
            <button
              key={p}
              onClick={() => handlePersonaChange(p)}
              className={`p-3 rounded text-sm font-medium transition-all ${
                persona === p
                  ? "bg-blue-500 text-white shadow-md"
                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {PERSONA_PROFILES[p].name}
            </button>
          ))}
        </div>
      </div>

      {/* Routes Comparison Table */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Available Routes Ranked for {personaProfile.name}</h2>
        <div className="grid grid-cols-1 gap-3">
          {routes.map((route, idx) => (
            <div
              key={route.route_id}
              onClick={() => setSelectedRoute(route.route_id)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedRoute === route.route_id
                  ? "bg-blue-50 border-blue-500"
                  : "bg-white border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-2xl font-bold text-gray-400">#{idx + 1}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{route.name}</h3>
                      <p className="text-sm text-gray-600">
                        {route.mode_types} • {route.segments_count} segment{route.segments_count > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>💡 {route.explanation}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 ml-4">
                  <div className="text-right">
                    <div className="text-4xl">{route.overall_signal}</div>
                    <p className="text-xs text-gray-500 mt-1">Signal</p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      {Math.round(route.persona_score * 100)}%
                    </p>
                    <p className="text-xs text-gray-500">Match Score</p>
                  </div>

                  <div className="text-right text-sm text-gray-700">
                    <p><span className="font-semibold">{route.distance_km} km</span></p>
                    <p className="text-xs text-gray-500">{route.base_eta_min}+ min</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Route Info */}
      {selectedRoute && (
        <div className="p-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
          <h3 className="text-lg font-bold text-indigo-900 mb-2">
            ⭐ Selected Route Details
          </h3>
          <p className="text-indigo-800 text-sm">
            This route is optimized for <span className="font-semibold">{personaProfile.name}</span> at{" "}
            <span className="font-semibold">{time}</span>. The persona ranking system considered your preferences for{" "}
            <span className="font-semibold">mode of transport, traffic tolerance, and crowd comfort</span>.
          </p>
          {selectedRouteDetails && selectedPathPoints.length > 1 && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-indigo-200">
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                Route Path
              </p>
              <p className="mt-2 text-sm text-indigo-900 font-semibold">
                {selectedPathNames.join(" → ")}
              </p>
              <p className="mt-1 text-xs text-indigo-700">
                ({selectedPathCoords.join(" → ")})
              </p>
            </div>
          )}
        </div>
      )}

      {/* Info Section */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <h3 className="font-semibold text-orange-900 mb-2">📍 Demo Scope</h3>
          <p className="text-sm text-orange-800">
            Currently showing Andheri ↔ CST routes. Multi-route system is production-ready to expand to all Mumbai locations.
          </p>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">🚀 How Rankings Work</h3>
          <p className="text-sm text-blue-800">
            Routes are re-ranked based on persona preferences and real-time traffic. No new routes are generated—only existing options are intelligently ordered.
          </p>
        </div>
      </div>
    </div>
  );
}
