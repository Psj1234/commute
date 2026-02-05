"use client";

import React, { useEffect, useRef, useState } from "react";
import L, { LatLngExpression, Circle, GeoJSON } from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapProps {
  onLocationSelect?: (lat: number | null, lng: number | null, locationType: "start" | "end" | "reset") => void;
  routes?: Array<{
    id: string;
    name: string;
    start_lat: number;
    start_lng: number;
    end_lat: number;
    end_lng: number;
    geometry: string;
    steps?: Array<{ // NEW: Navigation steps
      step_number: number;
      instruction: string;
      modifier?: string;
      name?: string;
      distance: number;
    }>;
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
  highlightedStepIndex?: number; // NEW: Highlighted step
  onStepClick?: (stepIndex: number) => void; // NEW: Step click callback
}

export default function LeafletMap({
  onLocationSelect,
  routes = [],
  osintZones = [],
  showOSINT = true,
  highlightedRouteId,
  highlightedStepIndex, // NEW
  onStepClick, // NEW
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const osintLayerRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const routeLayersRef = useRef<{ [key: string]: L.Polyline }>({});
  const stepLayersRef = useRef<{ [key: string]: L.Polyline[] }>({}); // NEW: Store step segments
  const stepMarkersRef = useRef<{ [key: string]: L.CircleMarker[] }>({}); // NEW: Store step markers
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const [instruction, setInstruction] = useState<string>("Text-based location search enabled. Use the search box to enter start and destination.");
  const [localStart, setLocalStart] = useState<{ lat: number; lng: number } | null>(null);
  const [localEnd, setLocalEnd] = useState<{ lat: number; lng: number } | null>(null);

  // NEW: Decode polyline6 format (OSRM uses precision 6)
  function decodePolyline(encoded: string, precision = 6): [number, number][] {
    const factor = Math.pow(10, precision);
    const coords: [number, number][] = [];
    let lat = 0, lng = 0, index = 0;

    while (index < encoded.length) {
      let shift = 0, result = 0, byte;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
      lng += dlng;

      coords.push([lat / factor, lng / factor]);
    }
    return coords;
  }

  // NEW: Format instruction for tooltip
  function formatInstruction(step: any): string {
    const actions: { [key: string]: string } = {
      'depart': 'Start',
      'arrive': 'Arrive',
      'turn': `Turn ${step.modifier || ''}`,
      'continue': 'Continue',
      'merge': 'Merge',
      'on ramp': 'Take ramp',
      'off ramp': 'Take exit',
      'fork': `Fork ${step.modifier || ''}`,
      'end of road': 'End of road',
      'roundabout': 'Roundabout',
    };
    const action = actions[step.instruction] || 'Continue';
    const name = step.name && step.name !== 'unnamed road' ? ` onto ${step.name}` : '';
    return `${action}${name}`;
  }

  // Helper: find nearest marker to a click
  function getNearestMarker(lat: number, lng: number) {
    if (!localStart && !localEnd) return null;
    if (localStart && !localEnd) return "start";
    if (!localStart && localEnd) return "end";
    if (localStart && localEnd) {
      const startDist = Math.hypot(lat - localStart.lat, lng - localStart.lng);
      const endDist = Math.hypot(lat - localEnd.lat, lng - localEnd.lng);
      return startDist < endDist ? "start" : "end";
    }
    return null;
  }

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const map = L.map(mapContainerRef.current, {
      crs: L.CRS.EPSG3857, // Web Mercator - default
    }).setView([40.7128, -74.006], 14);
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
    // Clear all previous route polylines
    Object.values(routeLayersRef.current).forEach((layer) => {
      if (layer && mapRef.current?.hasLayer(layer)) {
        try { layer.remove(); } catch {}
      }
    });
    routeLayersRef.current = {};

    // NEW: Clear step layers and markers
    Object.values(stepLayersRef.current).forEach((layers) => {
      layers.forEach((layer) => {
        if (layer && mapRef.current?.hasLayer(layer)) {
          try { layer.remove(); } catch {}
        }
      });
    });
    stepLayersRef.current = {};

    Object.values(stepMarkersRef.current).forEach((markers) => {
      markers.forEach((marker) => {
        if (marker && mapRef.current?.hasLayer(marker)) {
          try { marker.remove(); } catch {}
        }
      });
    });
    stepMarkersRef.current = {};

    // Render new routes from API
    routes.forEach((route, idx) => {
      if (!route.geometry) return;
      
      try {
        // Parse geometry if it's a string
        let coords: [number, number][] = [];
        if (typeof route.geometry === 'string') {
          // Try to decode as polyline6 first (OSRM format)
          try {
            coords = decodePolyline(route.geometry, 6);
          } catch {
            // Try to parse as JSON
            try {
              const parsed = JSON.parse(route.geometry);
              if (Array.isArray(parsed)) {
                coords = parsed;
              }
            } catch {
              return;
            }
          }
        }
        
        if (!Array.isArray(coords) || coords.length === 0) return;

        // Determine color based on selection
        const isHighlighted = route.id === highlightedRouteId;
        const color = isHighlighted ? "#ef4444" : idx === 0 ? "#3b82f6" : "#9ca3af";
        const weight = isHighlighted ? 5 : 3;
        const opacity = isHighlighted ? 1 : 0.6;

        // Draw main route polyline (background)
        const polyline = L.polyline(coords, {
          color,
          weight,
          opacity: opacity * 0.3,
          dashArray: isHighlighted ? "" : "4,4",
        })
          .bindPopup(`${route.name}`)
          .addTo(mapRef.current!);

        routeLayersRef.current[route.id] = polyline;

        // NEW: If this is the highlighted route with steps, draw step segments
        if (isHighlighted && route.steps && route.steps.length > 0) {
          const stepLayers: L.Polyline[] = [];
          const stepMarkers: L.CircleMarker[] = [];
          
          // Calculate cumulative distances to map steps to polyline segments
          let distanceSoFar = 0;
          const stepDistances = route.steps.map((step) => {
            const start = distanceSoFar;
            distanceSoFar += step.distance;
            return { start, end: distanceSoFar };
          });

          // Calculate total route distance from coordinates
          let totalRouteDistance = 0;
          for (let i = 1; i < coords.length; i++) {
            const [lat1, lng1] = coords[i - 1];
            const [lat2, lng2] = coords[i];
            totalRouteDistance += mapRef.current!.distance([lat1, lng1], [lat2, lng2]);
          }

          // Create segment for each step
          route.steps.forEach((step, stepIdx) => {
            const { start, end } = stepDistances[stepIdx];
            const startRatio = start / totalRouteDistance;
            const endRatio = end / totalRouteDistance;

            // Find coordinate indices for this step
            let currentDist = 0;
            let startCoordIdx = 0;
            let endCoordIdx = coords.length - 1;

            for (let i = 1; i < coords.length; i++) {
              const [lat1, lng1] = coords[i - 1];
              const [lat2, lng2] = coords[i];
              const segDist = mapRef.current!.distance([lat1, lng1], [lat2, lng2]);
              
              if (currentDist / totalRouteDistance <= startRatio && (currentDist + segDist) / totalRouteDistance >= startRatio) {
                startCoordIdx = i - 1;
              }
              if (currentDist / totalRouteDistance <= endRatio && (currentDist + segDist) / totalRouteDistance >= endRatio) {
                endCoordIdx = i;
              }
              
              currentDist += segDist;
            }

            // Extract segment coordinates
            const segmentCoords = coords.slice(startCoordIdx, endCoordIdx + 1);
            if (segmentCoords.length < 2) return;

            // Determine if this step is highlighted
            const isStepHighlighted = highlightedStepIndex === stepIdx;
            const stepColor = isStepHighlighted ? "#fbbf24" : "#ef4444";
            const stepWeight = isStepHighlighted ? 7 : 5;
            const stepOpacity = isStepHighlighted ? 1 : 0.7;

            // Draw step segment
            const stepPolyline = L.polyline(segmentCoords, {
              color: stepColor,
              weight: stepWeight,
              opacity: stepOpacity,
            })
              .bindPopup(`
                <div class="text-sm">
                  <strong>Step ${step.step_number}</strong><br/>
                  ${formatInstruction(step)}<br/>
                  <span class="text-xs text-gray-500">
                    ${(step.distance / 1000).toFixed(2)} km
                  </span>
                </div>
              `)
              .bindTooltip(`Step ${step.step_number}: ${formatInstruction(step)}`, {
                permanent: false,
                direction: 'top',
              })
              .on('click', () => {
                onStepClick?.(stepIdx);
              })
              .on('mouseover', function(this: L.Polyline) {
                this.setStyle({ weight: stepWeight + 2, opacity: 1 });
              })
              .on('mouseout', function(this: L.Polyline) {
                this.setStyle({ weight: stepWeight, opacity: stepOpacity });
              })
              .addTo(mapRef.current!);

            stepLayers.push(stepPolyline);

            // Add marker at the start of each step
            const [startLat, startLng] = segmentCoords[0];
            const marker = L.circleMarker([startLat, startLng], {
              radius: 5,
              fillColor: isStepHighlighted ? "#fbbf24" : "#fff",
              color: "#ef4444",
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8,
            })
              .bindTooltip(`${step.step_number}`, {
                permanent: true,
                direction: 'center',
                className: 'step-number-label',
              })
              .on('click', () => {
                onStepClick?.(stepIdx);
                mapRef.current?.setView([startLat, startLng], 16, { animate: true });
              })
              .addTo(mapRef.current!);

            stepMarkers.push(marker);
          });

          stepLayersRef.current[route.id] = stepLayers;
          stepMarkersRef.current[route.id] = stepMarkers;
        }
      } catch (err) {
        console.error("Error rendering route:", err, route);
      }
    });
  }, [routes, highlightedRouteId, highlightedStepIndex, onStepClick]);

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

  // DISABLED: Map click location picking - use text search instead
  // Previous functionality removed to enforce text-only location input via Nominatim geocoding

  // Draw/update start/end markers and polyline using local state
  useEffect(() => {
    if (!mapRef.current) return;
    // Remove old markers/polyline with defensive checks
    if (startMarkerRef.current) {
      try { startMarkerRef.current.remove(); } catch {}
      startMarkerRef.current = null;
    }
    if (endMarkerRef.current) {
      try { endMarkerRef.current.remove(); } catch {}
      endMarkerRef.current = null;
    }
    if (polylineRef.current) {
      try { polylineRef.current.remove(); } catch {}
      polylineRef.current = null;
    }
    // Draw start marker
    if (localStart) {
      startMarkerRef.current = L.circleMarker([localStart.lat, localStart.lng], {
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
    // Draw end marker
    if (localEnd) {
      endMarkerRef.current = L.circleMarker([localEnd.lat, localEnd.lng], {
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
    // Draw polyline if both exist
    if (localStart && localEnd) {
      polylineRef.current = L.polyline([
        [localStart.lat, localStart.lng],
        [localEnd.lat, localEnd.lng],
      ], {
        color: "#6366f1",
        weight: 4,
        opacity: 0.8,
        dashArray: "6, 6",
      }).addTo(mapRef.current!);
    }
  }, [localStart, localEnd]);

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
      {/* Coordinates display below map */}
      <div className="mt-2 px-4 text-xs text-gray-700">
        {localStart && (
          <div>Start: 📍 {localStart.lat.toFixed(5)}, {localStart.lng.toFixed(5)}</div>
        )}
        {localEnd && (
          <div>End: 🎯 {localEnd.lat.toFixed(5)}, {localEnd.lng.toFixed(5)}</div>
        )}
      </div>
      {/* Reset button removed - text-based input only */}

      {/* Greyscale filter for the whole map */}
      <style>{`
        .grayscale-map img {
          filter: grayscale(100%);
        }
        .step-number-label {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          font-weight: bold;
          font-size: 10px;
          color: #fff;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        }
        .step-number-label::before {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
