"use client";

import React, { useState, useEffect } from "react";

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
}

interface OSINTOverlayRendererProps {
  zones: OSINTZone[];
  visible?: boolean;
  onToggle?: (visible: boolean) => void;
}

const ZONE_TYPE_ICONS: { [key: string]: string } = {
  protest: "⚠️",
  congestion: "🚗",
  health_alert: "🏥",
  weather_disruption: "⛈️",
  infrastructure_issue: "🏗️",
  transit_delay: "🚇",
};

const ZONE_TYPE_DESCRIPTIONS: { [key: string]: string } = {
  protest: "Public Assembly",
  congestion: "Traffic Congestion",
  health_alert: "Health Advisory",
  weather_disruption: "Weather Impact",
  infrastructure_issue: "Construction/Infrastructure",
  transit_delay: "Transit Disruption",
};

export default function OSINTOverlayRenderer({ zones, visible = true, onToggle }: OSINTOverlayRendererProps) {
  const [expandedZoneId, setExpandedZoneId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(visible);

  const severityLabels = ["", "Low", "Low-Medium", "Medium", "High", "Critical"];
  const severityColors = {
    1: "bg-gray-100 border-gray-300 text-gray-700",
    2: "bg-gray-200 border-gray-400 text-gray-800",
    3: "bg-gray-300 border-gray-500 text-gray-900",
    4: "bg-gray-400 border-gray-600 text-gray-950",
    5: "bg-gray-600 border-gray-800 text-white",
  };

  const handleToggle = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    onToggle?.(newVisibility);
  };

  if (!isVisible || zones.length === 0) {
    return (
      <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
        <button
          onClick={handleToggle}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition"
        >
          <span className="text-lg">🗺️</span>
          OSINT Overlays ({zones.length} active)
          {!isVisible && <span className="text-gray-400 text-xs">(hidden)</span>}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🗺️</span>
          <h3 className="font-semibold text-gray-900">
            OSINT Information Overlays ({zones.length})
          </h3>
        </div>
        <button
          onClick={handleToggle}
          className="text-xs px-3 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 transition"
        >
          Hide
        </button>
      </div>

      <div className="space-y-2">
        {zones.map((zone) => {
          const icon = ZONE_TYPE_ICONS[zone.zone_type] || "📍";
          const description = ZONE_TYPE_DESCRIPTIONS[zone.zone_type] || zone.zone_type;
          const severity = Math.ceil(zone.severity);
          const severityLabel = severityLabels[severity] || "Unknown";
          const colorClass = severityColors[severity as keyof typeof severityColors] || severityColors[3];
          const isExpanded = expandedZoneId === zone.id;

          return (
            <div
              key={zone.id}
              className={`border rounded-lg p-3 cursor-pointer transition ${colorClass}`}
              onClick={() => setExpandedZoneId(isExpanded ? null : zone.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-xl">{icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm break-words">
                      {description} ({severityLabel})
                    </p>
                    <p className="text-xs opacity-75 mt-1">{zone.description}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold ml-2 whitespace-nowrap">{Math.round(zone.severity * 20)}%</span>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-400 border-opacity-30 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="opacity-75">Active until:</span>
                    <span className="font-mono">
                      {new Date(zone.time_window_end).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-75">Coverage radius:</span>
                    <span className="font-mono">{zone.radius_km.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-75">Coordinates:</span>
                    <span className="font-mono">
                      {zone.center_lat.toFixed(3)}, {zone.center_lng.toFixed(3)}
                    </span>
                  </div>
                  <div className="mt-2 p-2 bg-black bg-opacity-10 rounded text-xs italic">
                    ℹ️ This is informational data only. It does not predict outcomes or indicate permanent risk.
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 border border-gray-200">
        <p className="font-semibold mb-1">ℹ️ About OSINT Overlays</p>
        <ul className="space-y-1 text-xs">
          <li>• Data is time-bound and decays as conditions change</li>
          <li>• Informational only - used for contextual awareness</li>
          <li>• Applied as soft penalty, not route elimination</li>
          <li>• No user surveillance or permanent risk labels</li>
        </ul>
      </div>
    </div>
  );
}
