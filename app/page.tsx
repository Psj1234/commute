"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, MapPin, TrendingUp, Shield, Zap } from "lucide-react";

export default function Home() {
  const [userId] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("commute_user_id");
      if (stored) return stored;
    }
    return "";
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="font-semibold text-lg text-zinc-900">
            Commute Intelligence Engine
          </div>
          <div className="text-sm text-zinc-600">
            Confidence-based urban routing
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center space-y-8">
          <h1 className="text-5xl font-bold text-zinc-900 leading-tight">
            Commute smarter,
            <br />
            not just faster
          </h1>

          <p className="text-xl text-zinc-600 max-w-2xl mx-auto leading-relaxed">
            Most routing apps optimize for speed. We optimize for
            <span className="font-semibold text-zinc-900"> confidence.</span>
            <br />
            <br />
            Commute Intelligence Engine learns from every journey—detecting delays,
            predicting risks, and adapting to your commute style. The result? Routes
            you can rely on.
          </p>

          <div className="pt-8 space-y-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-zinc-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-zinc-800 transition-colors"
            >
              View Demo <ArrowRight size={18} />
            </Link>
            <p className="text-sm text-zinc-500">
              No login required. Anonymous, privacy-first routing.
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-32 grid md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-zinc-100 rounded-lg">
                <Shield size={24} className="text-zinc-700" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 mb-1">
                  Confidence Scoring
                </h3>
                <p className="text-zinc-600 text-sm">
                  Every route gets a reliability score. Know what to expect before you leave.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-zinc-100 rounded-lg">
                <TrendingUp size={24} className="text-zinc-700" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 mb-1">
                  Failure Prediction
                </h3>
                <p className="text-zinc-600 text-sm">
                  System learns when and where delays happen. Avoids hotspots proactively.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-zinc-100 rounded-lg">
                <Zap size={24} className="text-zinc-700" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 mb-1">
                  Persona-Aware Routing
                </h3>
                <p className="text-zinc-600 text-sm">
                  Routes adapt to your commute style: Speed? Safety? Comfort? We adapt.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-zinc-100 rounded-lg">
                <MapPin size={24} className="text-zinc-700" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 mb-1">
                  Real-Time Alerts
                </h3>
                <p className="text-zinc-600 text-sm">
                  Early warning of high-risk zones. Auto-reroute if confidence drops.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* The Problem Section */}
        <div className="mt-24 bg-zinc-50 border border-zinc-200 rounded-xl p-12 space-y-6">
          <h2 className="text-2xl font-bold text-zinc-900">
            Why routing confidence matters
          </h2>
          <p className="text-zinc-600">
            Traditional navigation apps show you <span className="font-semibold">the fastest route</span>. But faster is
            meaningless if you arrive late. Construction, events, transit delays—real cities
            are unpredictable.
          </p>
          <p className="text-zinc-600">
            Commute Intelligence Engine predicts the
            <span className="font-semibold"> most reliable route</span> given current conditions.
            That means fewer surprises, less stress, and commutes you can actually count on.
          </p>
        </div>

        {/* How It Works */}
        <div className="mt-24 space-y-12">
          <h2 className="text-2xl font-bold text-zinc-900 text-center">
            How it works
          </h2>

          <div className="space-y-8">
            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white font-bold">
                  1
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 mb-2">
                  Track every journey
                </h3>
                <p className="text-zinc-600">
                  System passively logs GPS, timing, and events (delays, reroutes, idle periods).
                </p>
              </div>
            </div>

            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white font-bold">
                  2
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 mb-2">
                  Detect failures
                </h3>
                <p className="text-zinc-600">
                  Engine identifies delays, unexpected idle times, and forced reroutes. Groups by location + time-window.
                </p>
              </div>
            </div>

            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white font-bold">
                  3
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 mb-2">
                  Build confidence scores
                </h3>
                <p className="text-zinc-600">
                  Computes Route Confidence Index (RCI): 35% on-time probability, 25% transfer success, 20% crowd stability, 10% delay variance, 10% last-mile availability.
                </p>
              </div>
            </div>

            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white font-bold">
                  4
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 mb-2">
                  Learn your style
                </h3>
                <p className="text-zinc-600">
                  Infers your commute persona: RUSHER (speed-first), SAFE_PLANNER (reliability-first), COMFORT_SEEKER (low-stress), or EXPLORER (flexible).
                </p>
              </div>
            </div>

            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white font-bold">
                  5
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 mb-2">
                  Select the best route
                </h3>
                <p className="text-zinc-600">
                  Autopilot applies persona rules to rank routes. RUSHER picks fastest. SAFE_PLANNER picks highest RCI. COMFORT_SEEKER minimizes crowds. EXPLORER balances all factors.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Persona-Traffic Integration CTA */}
        <div className="mt-24 bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-200 rounded-xl p-12 space-y-6">
          <h2 className="text-2xl font-bold text-indigo-900">
            🧠 Try Persona-Based Traffic-Aware Routing
          </h2>
          <p className="text-indigo-800">
            Demo the next evolution: Routes intelligently re-ranked based on your commute style and live traffic patterns. 
            Try different personas and watch how the system adapts to your preferences.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link
              href="/persona/routes"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Explore Personas <ArrowRight size={18} />
            </Link>
            <a
              href="/api/routes/personalized?persona=RUSHER&time=09:30"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-indigo-600 text-indigo-600 px-6 py-3 rounded-lg font-medium hover:bg-indigo-50 transition-colors"
            >
              API Demo
            </a>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-24 text-center space-y-6">
          <h2 className="text-3xl font-bold text-zinc-900">
            Ready to commit confidently?
          </h2>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-zinc-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-zinc-800 transition-colors"
          >
            View Dashboard <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 mt-24 py-8">
        <div className="max-w-5xl mx-auto px-6 text-center text-sm text-zinc-500">
          <p>Commute Intelligence Engine • A hackathon project demonstrating confidence-based urban routing</p>
        </div>
      </footer>
    </div>
  );
}
