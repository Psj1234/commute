/**
 * Transit Route Details Component
 * 
 * Displays detailed transit route information including:
 * - Start/end stations
 * - Transit line names
 * - Travel segments with timing
 * - Transfer information
 * - Crowd levels
 */

"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface TransitLeg {
  mode: "TRAIN" | "METRO";
  start_station: string;
  end_station: string;
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
  travel_time_minutes: number;
  wait_time_minutes: number;
  distance_km: number;
  crowd_score: number;
  line_name: string;
  stop_count: number;
}

interface TransitRouteDetailsProps {
  legs: TransitLeg[];
  totalTime: number;
  totalWaitTime: number;
  transferCount: number;
  distance: number;
  rci: number;
}

const ModeIcon = ({ mode }: { mode: "TRAIN" | "METRO" }) => {
  if (mode === "TRAIN") return <span className="text-lg">🚂</span>;
  return <span className="text-lg">🚇</span>;
};

const ModeLabel = ({ mode }: { mode: "TRAIN" | "METRO" }) => {
  return mode === "TRAIN" ? "Train" : "Metro";
};

const CrowdIndicator = ({ score }: { score: number }) => {
  const percentage = Math.round(score * 100);
  let label = "Empty";
  let color = "text-green-600 bg-green-50";

  if (percentage < 30) {
    label = "Uncrowded";
    color = "text-green-600 bg-green-50";
  } else if (percentage < 50) {
    label = "Moderate";
    color = "text-yellow-600 bg-yellow-50";
  } else if (percentage < 75) {
    label = "Crowded";
    color = "text-orange-600 bg-orange-50";
  } else {
    label = "Very Crowded";
    color = "text-red-600 bg-red-50";
  }

  return (
    <div className={`text-xs font-semibold px-2 py-1 rounded ${color}`}>
      {label} ({percentage}%)
    </div>
  );
};

export default function TransitRouteDetails({
  legs,
  totalTime,
  totalWaitTime,
  transferCount,
  distance,
  rci,
}: TransitRouteDetailsProps) {
  const [expandedLegIndex, setExpandedLegIndex] = useState<number | null>(0);

  const getLineColor = (lineName: string): string => {
    const lowerName = lineName.toLowerCase();
    if (lowerName.includes("red")) return "bg-red-100 text-red-900 border-red-300";
    if (lowerName.includes("blue")) return "bg-blue-100 text-blue-900 border-blue-300";
    if (lowerName.includes("green")) return "bg-green-100 text-green-900 border-green-300";
    if (lowerName.includes("yellow")) return "bg-yellow-100 text-yellow-900 border-yellow-300";
    if (lowerName.includes("purple")) return "bg-purple-100 text-purple-900 border-purple-300";
    if (lowerName.includes("express")) return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-gray-100 text-gray-900 border-gray-300";
  };

  const travelTime = totalTime - totalWaitTime;

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="grid grid-cols-5 gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
        <div className="text-center">
          <div className="text-xl font-bold text-blue-900">{totalTime}</div>
          <div className="text-xs text-blue-700">Total Time (min)</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-blue-900">{travelTime}</div>
          <div className="text-xs text-blue-700">Travel (min)</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-blue-900">{totalWaitTime}</div>
          <div className="text-xs text-blue-700">Waiting (min)</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-blue-900">{distance.toFixed(1)}</div>
          <div className="text-xs text-blue-700">Distance (km)</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-blue-900">{(rci * 100).toFixed(0)}%</div>
          <div className="text-xs text-blue-700">Confidence</div>
        </div>
      </div>

      {/* Legs */}
      <div className="space-y-2">
        {legs.map((leg, idx) => {
          const isExpanded = expandedLegIndex === idx;

          return (
            <div key={`leg_${idx}`} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Leg Header */}
              <button
                onClick={() => setExpandedLegIndex(isExpanded ? null : idx)}
                className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1 text-left">
                  {/* Mode Icon */}
                  <div className="flex-shrink-0">
                    <ModeIcon mode={leg.mode} />
                  </div>

                  {/* Leg Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 text-sm">
                        {ModeLabel(leg.mode)} Line
                      </span>
                      <span
                        className={`px-2 py-1 rounded border text-xs font-bold ${getLineColor(
                          leg.line_name
                        )}`}
                      >
                        {leg.line_name}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">{leg.start_station}</span>
                      <span className="text-gray-400 mx-2">→</span>
                      <span className="font-medium">{leg.end_station}</span>
                    </div>
                  </div>

                  {/* Timing */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-gray-900">
                      {leg.travel_time_minutes}
                      <span className="text-xs text-gray-600 ml-1">min</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {leg.stop_count} stop{leg.stop_count !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                {/* Expand Icon */}
                <div className="ml-3 flex-shrink-0 text-gray-400">
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="p-4 bg-white border-t border-gray-200 space-y-3">
                  {/* Boarding Info */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Boarding Information
                    </p>
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <div className="text-sm">
                        <span className="font-semibold text-blue-900">📍 Start Station:</span>
                        <span className="text-blue-800 ml-2">{leg.start_station}</span>
                      </div>
                      <div className="text-sm mt-1">
                        <span className="font-semibold text-blue-900">🎫 Line:</span>
                        <span className="text-blue-800 ml-2 font-mono">{leg.line_name}</span>
                      </div>
                      <div className="text-sm mt-1">
                        <span className="font-semibold text-blue-900">⏱️ Wait Time:</span>
                        <span className="text-blue-800 ml-2">{leg.wait_time_minutes} minutes</span>
                      </div>
                    </div>
                  </div>

                  {/* Journey Details */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Journey Details
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <div className="text-xs text-gray-600 mb-1">Travel Time</div>
                        <div className="text-lg font-bold text-gray-900">
                          {leg.travel_time_minutes} min
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <div className="text-xs text-gray-600 mb-1">Distance</div>
                        <div className="text-lg font-bold text-gray-900">
                          {leg.distance_km.toFixed(1)} km
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <div className="text-xs text-gray-600 mb-1">Stops</div>
                        <div className="text-lg font-bold text-gray-900">
                          {leg.stop_count}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <div className="text-xs text-gray-600 mb-1">Crowding</div>
                        <div className="text-lg font-bold text-gray-900">
                          {Math.round(leg.crowd_score * 100)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Destination Info */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Destination
                    </p>
                    <div className="bg-green-50 p-3 rounded border border-green-200">
                      <div className="text-sm">
                        <span className="font-semibold text-green-900">📍 End Station:</span>
                        <span className="text-green-800 ml-2">{leg.end_station}</span>
                      </div>
                      <div className="text-sm mt-1">
                        <span className="font-semibold text-green-900">Arrival:</span>
                        <span className="text-green-800 ml-2">
                          ~{leg.wait_time_minutes + leg.travel_time_minutes} minutes
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Crowd Level */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Transit Conditions
                    </p>
                    <CrowdIndicator score={leg.crowd_score} />
                  </div>

                  {/* Coordinates (if available) */}
                  {leg.start_lat && leg.start_lng && leg.end_lat && leg.end_lng && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Coordinates
                      </p>
                      <div className="bg-gray-50 p-2 rounded text-xs font-mono text-gray-600">
                        <div>Start: {leg.start_lat.toFixed(4)}, {leg.start_lng.toFixed(4)}</div>
                        <div className="mt-1">
                          End: {leg.end_lat.toFixed(4)}, {leg.end_lng.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Divider between legs */}
              {idx < legs.length - 1 && (
                <div className="flex items-center justify-center bg-gray-100 py-2">
                  <div className="text-sm font-bold text-gray-600">↓</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Transfer Summary */}
      {transferCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="text-xs font-semibold text-amber-900 mb-1">
            ⚡ {transferCount} Transfer{transferCount !== 1 ? "s" : ""}
          </div>
          <div className="text-xs text-amber-800">
            Plan ~{transferCount * 3}-{transferCount * 5} extra minutes for connections and platform changes.
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        <p className="font-semibold mb-1">💡 Tips:</p>
        <ul className="space-y-1 text-xs">
          <li>• Arrive 5-10 minutes early to avoid missing your connection</li>
          <li>• Check live updates before boarding, schedules may vary</li>
          <li>• Have your transit card or payment method ready at the station</li>
          <li>• Note the line colors and station names for easy navigation</li>
        </ul>
      </div>
    </div>
  );
}
