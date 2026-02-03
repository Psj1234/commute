"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertTriangle, Zap } from "lucide-react";
import { SAMPLE_ROUTES } from "@/app/lib/simulated-data";

interface RouteData {
  id: string;
  name: string;
  distance: number;
  baseEta: number;
  rciScore: number;
  failureScore: number;
  crowdLevel: number;
}

export default function RoutesComparison() {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoutes();
  }, []);

  async function fetchRoutes() {
    setLoading(true);
    try {
      const response = await fetch("/api/routes/get");
      const data = await response.json();
      setRoutes(data.routes);
    } catch (error) {
      console.error("Failed to fetch routes:", error);
    }
    setLoading(false);
  }

  function getRecommendationReason(route: RouteData): string {
    if (route.rciScore > 0.7) {
      return "Highest confidence score. Most reliable for safe commute.";
    }
    if (route.baseEta < 30) {
      return "Fastest option. Best for speed-focused commuters.";
    }
    if (route.crowdLevel < 50) {
      return "Least crowded. Best for comfort-focused commuters.";
    }
    return "Balanced option with good reliability.";
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
          <h1 className="font-semibold text-lg text-zinc-900">Route Comparison</h1>
          <div className="w-16"></div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Explanation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="font-semibold text-blue-900 mb-2">What You're Seeing</h2>
            <p className="text-blue-800 text-sm leading-relaxed">
              Below is a detailed comparison of available routes. Each route is scored on multiple dimensions:
              <span className="font-semibold"> Route Confidence Index (RCI)</span> measures reliability,
              <span className="font-semibold"> Failure Risk</span> indicates likelihood of delays,
              and <span className="font-semibold"> Crowd Level</span> shows expected congestion.
            </p>
          </div>

          {/* Routes Table */}
          {loading ? (
            <div className="text-center py-12 text-zinc-500">Loading routes...</div>
          ) : (
            <div className="space-y-6">
              {routes.map((route, idx) => (
                <div
                  key={route.id}
                  className="border border-zinc-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Route Header */}
                  <div className="bg-gradient-to-r from-zinc-50 to-zinc-100 border-b border-zinc-200 px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-lg text-zinc-900">
                          {route.name}
                        </h3>
                        <p className="text-sm text-zinc-600 mt-1">
                          {getRecommendationReason(route)}
                        </p>
                      </div>
                      {idx === 0 && (
                        <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Route Details */}
                  <div className="px-6 py-6 space-y-6">
                    {/* Key Metrics Grid */}
                    <div className="grid md:grid-cols-4 gap-4">
                      {/* Distance */}
                      <div className="bg-zinc-50 rounded-lg p-4">
                        <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">
                          Distance
                        </p>
                        <p className="text-2xl font-bold text-zinc-900">
                          {route.distance}
                          <span className="text-sm font-normal text-zinc-600"> km</span>
                        </p>
                      </div>

                      {/* ETA */}
                      <div className="bg-zinc-50 rounded-lg p-4">
                        <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">
                          Estimated Time
                        </p>
                        <p className="text-2xl font-bold text-zinc-900">
                          {route.baseEta}
                          <span className="text-sm font-normal text-zinc-600"> min</span>
                        </p>
                      </div>

                      {/* Crowd Level */}
                      <div className="bg-zinc-50 rounded-lg p-4">
                        <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">
                          Expected Crowd
                        </p>
                        <p className="text-2xl font-bold text-zinc-900">
                          {Math.round(route.crowdLevel)}
                          <span className="text-sm font-normal text-zinc-600">%</span>
                        </p>
                      </div>

                      {/* RCI Score */}
                      <div className={`rounded-lg p-4 ${
                        route.rciScore > 0.7
                          ? "bg-green-50"
                          : route.rciScore > 0.5
                          ? "bg-yellow-50"
                          : "bg-red-50"
                      }`}>
                        <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">
                          Confidence
                        </p>
                        <p className={`text-2xl font-bold ${
                          route.rciScore > 0.7
                            ? "text-green-600"
                            : route.rciScore > 0.5
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}>
                          {(route.rciScore * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    {/* Detailed Analysis */}
                    <div className="space-y-4 border-t border-zinc-200 pt-6">
                      {/* RCI Breakdown */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle size={18} className="text-green-600" />
                          <h4 className="font-semibold text-zinc-900">Route Confidence Index (RCI)</h4>
                        </div>
                        <p className="text-sm text-zinc-600 mb-3">
                          RCI combines 5 factors to predict on-time arrival probability:
                        </p>
                        <div className="space-y-2 ml-6">
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-600">On-time probability (35%)</span>
                            <span className="font-medium">{(route.rciScore * 0.35 * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-600">Transfer success (25%)</span>
                            <span className="font-medium">{(route.rciScore * 0.25 * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-600">Crowd stability (20%)</span>
                            <span className="font-medium">{(route.rciScore * 0.2 * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-600">Delay variance (10%)</span>
                            <span className="font-medium">{(route.rciScore * 0.1 * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-600">Last-mile availability (10%)</span>
                            <span className="font-medium">{(route.rciScore * 0.1 * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Failure Risk */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle size={18} className={
                            route.failureScore > 0.5
                              ? "text-red-600"
                              : route.failureScore > 0.3
                              ? "text-yellow-600"
                              : "text-green-600"
                          } />
                          <h4 className="font-semibold text-zinc-900">Failure Risk</h4>
                        </div>
                        <p className="text-sm text-zinc-600 mb-3">
                          Likelihood of delays, based on historical data from this location at this time.
                        </p>
                        <div className="ml-6">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-zinc-600">Risk Score</span>
                            <span className={`font-bold text-lg ${
                              route.failureScore > 0.5
                                ? "text-red-600"
                                : route.failureScore > 0.3
                                ? "text-yellow-600"
                                : "text-green-600"
                            }`}>
                              {(route.failureScore * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-zinc-200 rounded-full h-2 mt-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                route.failureScore > 0.5
                                  ? "bg-red-600"
                                  : route.failureScore > 0.3
                                  ? "bg-yellow-600"
                                  : "bg-green-600"
                              }`}
                              style={{ width: `${route.failureScore * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Crowd Prediction */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Zap size={18} className="text-yellow-600" />
                          <h4 className="font-semibold text-zinc-900">Expected Congestion</h4>
                        </div>
                        <p className="text-sm text-zinc-600 mb-3">
                          Predicted crowd level based on historical traffic patterns at this time.
                        </p>
                        <div className="ml-6">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-zinc-600">Crowd Level</span>
                            <span className="font-bold text-lg text-zinc-900">
                              {Math.round(route.crowdLevel)}%
                            </span>
                          </div>
                          <div className="w-full bg-zinc-200 rounded-full h-2 mt-2">
                            <div
                              className="h-2 rounded-full bg-yellow-600"
                              style={{ width: `${route.crowdLevel}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Why This Route */}
                    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-sm">
                      <p className="font-semibold text-zinc-900 mb-2">When to Choose This Route</p>
                      <p className="text-zinc-600">
                        {route.rciScore > 0.7
                          ? "Choose this route if reliability matters most. Lowest historical delay rates."
                          : route.baseEta < 30
                          ? "Choose this route if you're in a hurry. Fastest ETA across all options."
                          : route.crowdLevel < 50
                          ? "Choose this route for a more comfortable commute with fewer people."
                          : "Choose this route for balanced speed and reliability."}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-zinc-900">Next Steps</h3>
            <p className="text-sm text-zinc-600">
              Review the routes above and select one that matches your priorities. The system learns from your choices and will personalize recommendations over time.
            </p>
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
