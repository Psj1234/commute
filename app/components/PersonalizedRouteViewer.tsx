"use client";

import React, { useState, useEffect } from "react";
import {
  getModeEmoji,
  getTrafficSignal,
  getSignalDescription,
  getMumbaiDemoRoute,
  calculateAdjustedEta,
  calculateRouteMetrics,
  getTrafficForTime,
  type TrafficRoute,
  type TrafficSegment,
} from "@/app/lib/traffic-intelligence";
import {
  PERSONA_PROFILES,
  rankRoutesByPersona,
  type PersonaType,
} from "@/app/lib/persona-traffic-ranker";

interface PersonalizedRouteViewerProps {
  initialPersona?: PersonaType;
  initialTime?: string;
  onPersonaChange?: (persona: PersonaType) => void;
}

interface SegmentDisplay {
  segment: TrafficSegment;
  adjustedEta: number;
  signal: string;
  signalDescription: string;
}

export default function PersonalizedRouteViewer({
  initialPersona = "SAFE_PLANNER",
  initialTime = "09:30",
  onPersonaChange,
}: PersonalizedRouteViewerProps) {
  const [persona, setPersona] = useState<PersonaType>(initialPersona);
  const [time, setTime] = useState(initialTime);
  const [route, setRoute] = useState<TrafficRoute | null>(null);
  const [segments, setSegments] = useState<SegmentDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null);

  // Load and process route
  useEffect(() => {
    setLoading(true);
    const baseRoute = getMumbaiDemoRoute();
    const routeWithTraffic = getTrafficForTime(baseRoute, time);
    setRoute(routeWithTraffic);

    // Process segments for display
    const processedSegments = routeWithTraffic.segments.map((seg) => {
      const adjustedEta = calculateAdjustedEta(
        seg.base_eta_min,
        seg.traffic_density,
        seg.incident_rate
      );
      const signal = getTrafficSignal(seg.traffic_density, seg.crowd_score);
      const signalDescription = getSignalDescription(signal);

      return {
        segment: seg,
        adjustedEta,
        signal,
        signalDescription,
      };
    });

    setSegments(processedSegments);
    setLoading(false);
  }, [time]);

  // Handle persona change
  const handlePersonaChange = (newPersona: PersonaType) => {
    setPersona(newPersona);
    onPersonaChange?.(newPersona);
  };

  // Handle time change
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTime(e.target.value);
  };

  // Handle segment click to expand
  const toggleSegment = (segId: string) => {
    setExpandedSegment(expandedSegment === segId ? null : segId);
  };

  if (!route || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin mb-2">⏳</div>
          <p className="text-gray-600">Loading personalized route...</p>
        </div>
      </div>
    );
  }

  const personaProfile = PERSONA_PROFILES[persona];
  const rankedRoutes = rankRoutesByPersona([route], persona);
  const rankedRoute = rankedRoutes[0];
  const metrics = calculateRouteMetrics(route);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          {personaProfile.name} Commute Route
        </h1>
        <p className="text-gray-600">{personaProfile.description}</p>
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

      {/* Time Selector */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <label className="block text-sm font-semibold mb-3 text-gray-700">
          Departure Time
        </label>
        <input
          type="time"
          value={time}
          onChange={handleTimeChange}
          className="w-full md:w-32 px-3 py-2 border border-gray-300 rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-2">
          Traffic patterns adjust based on time of day (rush hours: 7-10 AM, 4-8 PM)
        </p>
      </div>

      {/* Route Overview */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-600 uppercase">Overall Status</p>
            <p className="text-2xl mt-1">{metrics.overall_signal}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase">Total Distance</p>
            <p className="text-xl font-semibold mt-1">{route.total_distance_km} km</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase">Estimated Time</p>
            <p className="text-xl font-semibold mt-1">{metrics.adjusted_eta_min} min</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase">Persona Match</p>
            <p className="text-xl font-semibold mt-1">
              {Math.round(rankedRoute.personaScore * 100)}%
            </p>
          </div>
        </div>
      </div>

      {/* Explanation */}
      {rankedRoute && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <span className="font-semibold">Why this route fits you:</span> {rankedRoute.explanation}
          </p>
        </div>
      )}

      {/* Route Details */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Route Segments</h2>
        <div className="space-y-2">
          {segments.map((segDisplay, index) => {
            const seg = segDisplay.segment;
            const isExpanded = expandedSegment === seg.id;

            return (
              <div
                key={seg.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Segment Header */}
                <button
                  onClick={() => toggleSegment(seg.id)}
                  className="w-full p-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 text-left flex-1">
                    <div className="text-3xl">{getModeEmoji(seg.mode)}</div>
                    <div>
                      <p className="font-semibold text-gray-900">{seg.name}</p>
                      <p className="text-sm text-gray-600">
                        {seg.distance_km} km • {segDisplay.adjustedEta} min
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{segDisplay.signal}</div>
                    <div className="text-gray-400">
                      {isExpanded ? "▼" : "▶"}
                    </div>
                  </div>
                </button>

                {/* Segment Details */}
                {isExpanded && (
                  <div className="p-4 bg-white border-t border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-600 uppercase">Traffic Density</p>
                        <p className="text-sm font-semibold mt-1">
                          {Math.round(seg.traffic_density * 100)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 uppercase">Crowd Score</p>
                        <p className="text-sm font-semibold mt-1">
                          {Math.round(seg.crowd_score * 100)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 uppercase">Incident Risk</p>
                        <p className="text-sm font-semibold mt-1">
                          {Math.round(seg.incident_rate * 100)}%
                        </p>
                      </div>
                    </div>

                    {/* Coordinates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 uppercase">Start</p>
                        <p className="text-sm font-mono text-gray-800 mt-1">
                          {seg.start_lat.toFixed(4)}, {seg.start_lng.toFixed(4)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 uppercase">End</p>
                        <p className="text-sm font-mono text-gray-800 mt-1">
                          {seg.end_lat.toFixed(4)}, {seg.end_lng.toFixed(4)}
                        </p>
                      </div>
                    </div>

                    {/* Signal Explanation */}
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                      <p>
                        <span className="font-semibold">{segDisplay.signal} Signal:</span>{" "}
                        {segDisplay.signalDescription}
                      </p>
                    </div>

                    {/* Persona-specific insight */}
                    {rankedRoute?.segmentExplanations[index] && (
                      <div className="mt-3 text-sm text-gray-700">
                        <p>
                          <span className="font-semibold">For {persona}:</span>{" "}
                          {rankedRoute.segmentExplanations[index]}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Traffic Pattern Explanation */}
      <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <h3 className="font-semibold text-purple-900 mb-2">📊 Traffic Signal Guide</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-2xl">🟥</p>
            <p className="text-purple-900 font-semibold">Red</p>
            <p className="text-purple-700">Heavy congestion / high crowd</p>
          </div>
          <div>
            <p className="text-2xl">🟨</p>
            <p className="text-purple-900 font-semibold">Yellow</p>
            <p className="text-purple-700">Moderate flow</p>
          </div>
          <div>
            <p className="text-2xl">🟩</p>
            <p className="text-purple-900 font-semibold">Green</p>
            <p className="text-purple-700">Free flow / light crowd</p>
          </div>
        </div>
      </div>

      {/* Persona Explanation */}
      <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
        <h3 className="font-semibold text-indigo-900 mb-3">About {personaProfile.name}</h3>
        <div className="space-y-2 text-sm text-indigo-800">
          <p>
            <span className="font-semibold">Description:</span> {personaProfile.description}
          </p>
          <p>
            <span className="font-semibold">Preferred Modes:</span>{" "}
            {Object.entries(personaProfile.modeWeights)
              .filter(([, weight]) => weight >= 0.8)
              .map(([mode]) => getModeEmoji(mode as TrafficSegment["mode"]))
              .join(" ")}
          </p>
        </div>
      </div>
    </div>
  );
}
