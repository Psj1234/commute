"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, AlertCircle, Zap } from "lucide-react";
import { SAMPLE_ALERT_ZONES } from "@/app/lib/simulated-data";

interface AlertZone {
  name: string;
  type: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  severity: number;
  description?: string;
}

export default function AlertsPage() {
  const [zones, setZones] = useState<AlertZone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setZones(SAMPLE_ALERT_ZONES);
    setLoading(false);
  }, []);

  function getSeverityColor(severity: number): string {
    if (severity >= 4) return "bg-red-100 border-red-300 text-red-900";
    if (severity >= 3) return "bg-orange-100 border-orange-300 text-orange-900";
    if (severity >= 2) return "bg-yellow-100 border-yellow-300 text-yellow-900";
    return "bg-blue-100 border-blue-300 text-blue-900";
  }

  function getSeverityIcon(severity: number) {
    if (severity >= 4) return <AlertTriangle size={24} className="text-red-600" />;
    if (severity >= 3) return <AlertCircle size={24} className="text-orange-600" />;
    if (severity >= 2) return <Zap size={24} className="text-yellow-600" />;
    return <AlertCircle size={24} className="text-blue-600" />;
  }

  function getZoneTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      SAFETY_ADVISORY: "Safety Advisory",
      EMERGENCY: "Emergency",
      TRAFFIC_HOTSPOT: "Traffic Hotspot",
      INFRASTRUCTURE_ISSUE: "Infrastructure",
    };
    return labels[type] || type;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900">
            <ArrowLeft size={18} />
            <span className="text-sm">Back</span>
          </Link>
          <h1 className="font-semibold text-lg text-zinc-900">Failure Hotspots & Alerts</h1>
          <div className="w-16"></div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Overview */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 space-y-3">
            <h2 className="font-semibold text-purple-900">What Are Failure Hotspots?</h2>
            <p className="text-sm text-purple-800 leading-relaxed">
              Failure hotspots are locations where the system has detected elevated failure rates—delays, forced reroutes,
              or unexpected idle times—at specific times of day. These are
              <span className="font-semibold"> not permanent labels</span> but rather statistical patterns learned from
              historical journey data. Alert zones are informational overlays (construction, safety advisories, emergency
              zones) used to explain why certain locations are unreliable at certain times.
            </p>
          </div>

          {/* Statistics */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">
                Total Zones
              </p>
              <p className="text-3xl font-bold text-zinc-900">{zones.length}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
                High Severity
              </p>
              <p className="text-3xl font-bold text-red-600">
                {zones.filter((z) => z.severity >= 4).length}
              </p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-2">
                Medium Severity
              </p>
              <p className="text-3xl font-bold text-orange-600">
                {zones.filter((z) => z.severity >= 2 && z.severity < 4).length}
              </p>
            </div>
          </div>

          {/* Alert Zones List */}
          {loading ? (
            <div className="text-center py-12 text-zinc-500">Loading alert zones...</div>
          ) : (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg text-zinc-900">Active Alert Zones</h2>
              {zones.map((zone, idx) => (
                <div
                  key={idx}
                  className={`border-l-4 rounded-lg p-6 space-y-4 ${getSeverityColor(zone.severity)}`}
                >
                  {/* Zone Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {getSeverityIcon(zone.severity)}
                      <div>
                        <h3 className="font-bold text-lg">{zone.name}</h3>
                        <p className="text-xs font-semibold opacity-75 mt-1">
                          {getZoneTypeLabel(zone.type)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold">Severity</div>
                      <div className="text-2xl font-bold">{zone.severity}/5</div>
                    </div>
                  </div>

                  {/* Description */}
                  {zone.description && (
                    <p className="text-sm opacity-90">{zone.description}</p>
                  )}

                  {/* Details */}
                  <div className="grid md:grid-cols-2 gap-4 text-sm opacity-85">
                    <div>
                      <span className="font-semibold">Location: </span>
                      <span>
                        ({zone.centerLat.toFixed(4)}, {zone.centerLng.toFixed(4)})
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold">Radius: </span>
                      <span>{zone.radiusKm} km</span>
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="bg-black bg-opacity-10 rounded p-3 text-xs opacity-90 space-y-1">
                    <p className="font-semibold">How This Affects Routing:</p>
                    <p>
                      • Routes passing through this zone will incur a confidence penalty
                    </p>
                    <p>
                      • Auto-pilot may recommend alternative routes with higher overall RCI
                    </p>
                    <p>
                      • You'll receive early warning before entering this zone
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Explanation Section */}
          <div className="space-y-6">
            <h2 className="font-semibold text-lg text-zinc-900">How Alerts Work</h2>

            <div className="space-y-4">
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
                <h3 className="font-semibold text-zinc-900 mb-2">Detection</h3>
                <p className="text-sm text-zinc-600">
                  The system monitors every completed journey. When actual arrival time exceeds expected time
                  by a threshold (e.g., 5+ minutes), a DELAY event is recorded. If a location accumulates
                  many delays in a short time window (e.g., 08:00-08:15), it becomes a hotspot.
                </p>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
                <h3 className="font-semibold text-zinc-900 mb-2">Time-Window Specificity</h3>
                <p className="text-sm text-zinc-600">
                  Hotspots are NOT permanent. They're tied to specific 15-minute windows. A location might be reliable
                  at 9 AM but a hotspot at 8:30 AM due to rush hour. This prevents over-penalizing locations that only
                  have issues during peak times.
                </p>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
                <h3 className="font-semibold text-zinc-900 mb-2">Failure Score Calculation</h3>
                <p className="text-sm text-zinc-600 font-mono bg-white p-2 rounded border border-zinc-200">
                  Failure Score = (0.4 × delay_probability) + (0.3 × reroute_rate) + (0.3 × normalized_wait_time)
                </p>
                <p className="text-sm text-zinc-600 mt-2">
                  Scores above 0.4 mark a location as a hotspot. The higher the score, the more the system
                  will avoid recommending routes through that location.
                </p>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
                <h3 className="font-semibold text-zinc-900 mb-2">Alert Zones vs. Failure Hotspots</h3>
                <ul className="text-sm text-zinc-600 space-y-2">
                  <li>
                    <span className="font-semibold">Alert Zones</span> are external advisories: construction, events,
                    safety concerns. Manually configured or from external sources.
                  </li>
                  <li>
                    <span className="font-semibold">Failure Hotspots</span> are learned from journey data. They emerge
                    automatically as the system gathers evidence of failures.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-zinc-900">What This Means for Your Commute</h3>
            <ul className="text-sm text-zinc-600 space-y-2">
              <li>✓ The system actively avoids recommending routes through high-risk zones</li>
              <li>✓ If you're currently on a route approaching a hotspot, you'll get early warning</li>
              <li>✓ Hotspots are temporary and time-specific—they update as patterns change</li>
              <li>✓ The system improves with every journey, learning new patterns over time</li>
            </ul>
            <Link
              href="/dashboard"
              className="inline-block bg-zinc-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-zinc-800 transition-colors text-sm"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
