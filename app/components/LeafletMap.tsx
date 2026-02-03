"use client";

import React, { useEffect, useRef, useState } from "react";
import L, { LatLngExpression, Circle, GeoJSON } from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapProps {
  onLocationSelect?: (lat: number, lng: number, locationType: "start" | "end") => void;
  routes?: Array<{
    id: string;
    name: string;
    start_lat: number;
    start_lng: number;
    end_lat: number;
    end_lng: number;
    geometry: string;
  }>;
  osintZones?: Array<{
    id: string;
    zone_type: string;
    severity: number;
    center_lat: number;
    center_lng: number;
    radius_km: number;
    description: string;
  }>;
  showOSINT?: boolean;
  highlightedRouteId?: string;
}

export default function LeafletMap({
  onLocationSelect,
  routes = [],
  osintZones = [],
  showOSINT = true,
  highlightedRouteId,
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const osintLayerRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const routeLayersRef = useRef<{ [key: string]: L.Polyline }>({});
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const [startLocation, setStartLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [endLocation, setEndLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [instruction, setInstruction] = useState<string>("Click to set start and end points");

  // Helper: find nearest marker to a click
  function getNearestMarker(lat: number, lng: number) {
    if (!startLocation && !endLocation) return null;
    if (startLocation && !endLocation) return "start";
    if (!startLocation && endLocation) return "end";
    if (startLocation && endLocation) {
      const startDist = Math.hypot(lat - startLocation.lat, lng - startLocation.lng);
      const endDist = Math.hypot(lat - endLocation.lat, lng - endLocation.lng);
      return startDist < endDist ? "start" : "end";
    }
    return null;
  }

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const map = L.map(mapContainerRef.current).setView([40.7128, -74.006], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      className: "grayscale-map",
    }).addTo(map);
    mapRef.current = map;
    osintLayerRef.current.addTo(map);
    return () => {
      map.remove();
    };
  }, []);

  // Remove demo route markers, use only start/end selection
  useEffect(() => {
    if (!mapRef.current) return;
    // Remove any demo route polylines/markers
    Object.values(routeLayersRef.current).forEach((layer) => layer.remove());
    routeLayersRef.current = {};
    // ...existing code...
  }, [routes, highlightedRouteId]);

  // Update OSINT zones
  useEffect(() => {
    if (!mapRef.current || !showOSINT) return;

    osintLayerRef.current.clearLayers();

    osintZones.forEach((zone) => {
      // Color by severity (grayscale)
      const severityColors = {
        1: { fill: "#e5e7eb", stroke: "#9ca3af", opacity: 0.3 },
        2: { fill: "#d1d5db", stroke: "#6b7280", opacity: 0.4 },
        3: { fill: "#9ca3af", stroke: "#4b5563", opacity: 0.5 },
        4: { fill: "#6b7280", stroke: "#1f2937", opacity: 0.6 },
        5: { fill: "#374151", stroke: "#111827", opacity: 0.7 },
      };

      const severityIndex = Math.min(5, Math.ceil(zone.severity)) as keyof typeof severityColors;
      const colors = severityColors[severityIndex];

      // Create circle for zone
      const circle = L.circle([zone.center_lat, zone.center_lng], {
        radius: zone.radius_km * 1000, // Convert km to meters
        fillColor: colors.fill,
        color: colors.stroke,
        weight: 2,
        opacity: 1,
        fillOpacity: colors.opacity,
      });

      // Add tooltip on hover
      const typeLabel = zone.zone_type.toUpperCase().replace(/_/g, " ");
      const severityLabel = ["Low", "Low-Medium", "Medium", "High", "Critical"][severityIndex - 1];

      circle.bindPopup(
        `<div class="text-sm">
          <strong>${typeLabel}</strong><br/>
          ${zone.description}<br/>
          <span class="text-xs text-gray-500">Severity: ${severityLabel}</span><br/>
          <span class="text-xs text-gray-400">ℹ️ Informational only</span>
        </div>`
      );

      circle.bindTooltip(`${typeLabel} (${severityLabel})`, {
        direction: "top",
        offset: [0, -10],
      });

      osintLayerRef.current.addLayer(circle);
    });
  }, [osintZones, showOSINT]);

  // Handle map clicks for start/end selection
  useEffect(() => {
    if (!mapRef.current) return;
    const handleClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (!startLocation && !endLocation) {
        setStartLocation({ lat, lng });
        setInstruction("Now click to set end point");
      } else if (startLocation && !endLocation) {
        setEndLocation({ lat, lng });
        setInstruction("Click to update nearest marker");
      } else if (startLocation && endLocation) {
        // Update nearest marker
        const nearest = getNearestMarker(lat, lng);
        if (nearest === "start") {
          setStartLocation({ lat, lng });
        } else {
          setEndLocation({ lat, lng });
        }
      }
    };
    mapRef.current.on("click", handleClick);
    return () => {
      mapRef.current?.off("click", handleClick);
    };
  }, [startLocation, endLocation]);

  // Draw/update start/end markers and polyline
  useEffect(() => {
    if (!mapRef.current) return;
    // Remove old markers/polyline
    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }
    if (endMarkerRef.current) {
      endMarkerRef.current.remove();
      endMarkerRef.current = null;
    }
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    // Add start marker
    if (startLocation) {
      startMarkerRef.current = L.circleMarker([startLocation.lat, startLocation.lng], {
        radius: 10,
        fillColor: "#22c55e",
        color: "#16a34a",
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9,
      })
        .bindPopup("Start Location")
        .addTo(mapRef.current!);
    }
    // Add end marker
    if (endLocation) {
      endMarkerRef.current = L.circleMarker([endLocation.lat, endLocation.lng], {
        radius: 10,
        fillColor: "#fff",
        color: "#ef4444",
        weight: 3,
        opacity: 1,
        fillOpacity: 0.5,
        dashArray: "4,4",
      })
        .bindPopup("End Location")
        .addTo(mapRef.current!);
    }
    // Draw polyline
    if (startLocation && endLocation) {
      polylineRef.current = L.polyline([
        [startLocation.lat, startLocation.lng],
        [endLocation.lat, endLocation.lng],
      ], {
        color: "#6366f1",
        weight: 4,
        opacity: 0.8,
        dashArray: "6, 6",
      }).addTo(mapRef.current!);
    }
  }, [startLocation, endLocation]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Instruction banner */}
      <div className="mb-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
        {instruction}
      </div>
      <div
        ref={mapContainerRef}
        className="flex-1 bg-gray-100 rounded-lg border border-gray-300"
        style={{ minHeight: "500px" }}
      />

      {/* Coordinates display */}
      <div className="mt-2 px-4 text-xs text-gray-700">
        {startLocation && (
          <div>Start: {startLocation.lat.toFixed(5)}, {startLocation.lng.toFixed(5)}</div>
        )}
        {endLocation && (
          <div>End: {endLocation.lat.toFixed(5)}, {endLocation.lng.toFixed(5)}</div>
        )}
      </div>

      {/* Reset button */}
      <div className="mt-2 px-4">
        <button
          onClick={() => {
            setStartLocation(null);
            setEndLocation(null);
            setInstruction("Click to set start and end points");
          }}
          className="px-3 py-2 text-xs rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 border"
        >
          Reset Locations
        </button>
      </div>

      {/* Greyscale filter for the whole map */}
      <style>{`
        .grayscale-map img {
          filter: grayscale(100%);
        }
      `}</style>
    </div>
  );
}
