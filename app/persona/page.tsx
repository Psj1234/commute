"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Zap, Shield, Heart, Compass } from "lucide-react";
import { getOrCreateUserId } from "@/app/lib/user-utils";

interface PersonaData {
  persona: {
    type: string;
    confidence: number;
    scores: {
      rusher: number;
      safePlanner: number;
      comfortSeeker: number;
      explorer: number;
    };
  };
  journeyCount: number;
}

const PERSONA_ICONS: Record<string, React.ReactNode> = {
  RUSHER: <Zap size={32} />,
  SAFE_PLANNER: <Shield size={32} />,
  COMFORT_SEEKER: <Heart size={32} />,
  EXPLORER: <Compass size={32} />,
};

const PERSONA_DESCRIPTIONS: Record<string, string> = {
  RUSHER:
    "Speed is your priority. You optimize for the fastest route, even if it has slightly higher risk. You adapt quickly to traffic and aren't afraid to reroute.",
  SAFE_PLANNER:
    "Reliability matters most. You prefer routes with proven on-time performance over faster alternatives. You value predictability and rarely take risks.",
  COMFORT_SEEKER:
    "You prioritize comfort and avoid stress. Fewer transfers, less crowding, and a smoother ride matter more than shaving off a few minutes.",
  EXPLORER:
    "You're flexible and adaptable. You're willing to try different routes and experiment. You balance multiple factors—speed, safety, and comfort.",
};

const PERSONA_ROUTING_RULES: Record<string, string[]> = {
  RUSHER: [
    "Always show fastest route first",
    "Auto-accept risky routes if ETA is significantly lower",
    "Highlight time-saving alternatives",
    "Minimal warnings about crowd levels",
  ],
  SAFE_PLANNER: [
    "Always show highest-confidence route first",
    "Avoid routes with elevated failure risk",
    "Warn before entering hotspots",
    "Prefer well-established routes",
  ],
  COMFORT_SEEKER: [
    "Prioritize routes with low crowd levels",
    "Minimize number of transfers",
    "Show estimated comfort metrics",
    "Avoid peak-hour suggestions",
  ],
  EXPLORER: [
    "Balance speed, reliability, and comfort",
    "Show diverse route options",
    "Encourage trying new routes",
    "Highlight interesting alternative paths",
  ],
};

export default function PersonaPage() {
  const [userId, setUserId] = useState<string>("");
  const [persona, setPersona] = useState<PersonaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = getOrCreateUserId();
    setUserId(id);
    fetchPersona(id);
  }, []);

  async function fetchPersona(id: string) {
    setLoading(true);
    try {
      const response = await fetch(`/api/persona?userId=${id}`);
      const data = await response.json();
      setPersona(data);
    } catch (error) {
      console.error("Failed to fetch persona:", error);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-zinc-500">Loading persona...</div>
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-zinc-500">Failed to load persona</div>
      </div>
    );
  }

  const personaType = persona.persona.type as keyof typeof PERSONA_DESCRIPTIONS;
  const scores = persona.persona.scores;
  const maxScore = Math.max(
    scores.rusher,
    scores.safePlanner,
    scores.comfortSeeker,
    scores.explorer
  );

  const sortedPersonas = [
    { name: "RUSHER", score: scores.rusher, color: "bg-red-100 text-red-700" },
    { name: "SAFE_PLANNER", score: scores.safePlanner, color: "bg-blue-100 text-blue-700" },
    { name: "COMFORT_SEEKER", score: scores.comfortSeeker, color: "bg-purple-100 text-purple-700" },
    { name: "EXPLORER", score: scores.explorer, color: "bg-green-100 text-green-700" },
  ].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900">
            <ArrowLeft size={18} />
            <span className="text-sm">Back</span>
          </Link>
          <h1 className="font-semibold text-lg text-zinc-900">Your Commute Persona</h1>
          <div className="w-16"></div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Primary Persona Card */}
          <div className="border-2 border-zinc-900 rounded-lg p-8 space-y-6 bg-gradient-to-br from-zinc-50 to-white">
            <div className="flex items-center gap-6">
              <div className="text-zinc-400">{PERSONA_ICONS[personaType]}</div>
              <div>
                <h2 className="text-3xl font-bold text-zinc-900">{personaType.replace(/_/g, " ")}</h2>
                <p className="text-sm text-zinc-600 mt-1">Your commute profile</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-zinc-700">Confidence</span>
                  <span className="text-lg font-bold text-zinc-900">
                    {(persona.persona.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-zinc-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-zinc-900 transition-all"
                    style={{ width: `${persona.persona.confidence * 100}%` }}
                  />
                </div>
              </div>

              <p className="text-zinc-600 leading-relaxed">
                {PERSONA_DESCRIPTIONS[personaType]}
              </p>
            </div>

            <div className="bg-zinc-100 border border-zinc-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-3">
                Journeys Analyzed
              </p>
              <p className="text-2xl font-bold text-zinc-900">{persona.journeyCount}</p>
              <p className="text-xs text-zinc-600 mt-1">
                Your persona improves with each journey
              </p>
            </div>
          </div>

          {/* Persona Scores Breakdown */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg text-zinc-900">All Persona Scores</h2>
            <p className="text-sm text-zinc-600">
              Below shows how strongly you align with each commute style. Your primary persona is the highest-scoring one.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {sortedPersonas.map((p, idx) => (
                <div key={p.name} className="border border-zinc-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-zinc-900">{p.name.replace(/_/g, " ")}</h3>
                    {idx === 0 && (
                      <span className="text-xs bg-zinc-900 text-white px-2 py-1 rounded">
                        Primary
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-600">Score</span>
                      <span className="font-bold text-lg text-zinc-900">
                        {(p.score * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="w-full bg-zinc-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${p.color}`}
                        style={{ width: `${p.score * 100}%` }}
                      />
                    </div>

                    {p.score === maxScore && (
                      <div className="text-xs text-zinc-600 bg-zinc-50 p-2 rounded">
                        ✓ This is your strongest alignment
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How Your Persona Affects Routing */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg text-zinc-900">How This Affects Your Routes</h2>
            <p className="text-sm text-zinc-600">
              The system applies specific routing rules based on your persona to help select the best routes for your style.
            </p>

            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-zinc-900 mb-3">
                  Rules Applied for {personaType.replace(/_/g, " ")}
                </h3>
                <ul className="space-y-2">
                  {PERSONA_ROUTING_RULES[personaType]?.map((rule, idx) => (
                    <li key={idx} className="flex gap-3 text-sm text-zinc-700">
                      <span className="text-zinc-400">▸</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Persona Evolution */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-blue-900">Your Persona Evolves</h3>
            <p className="text-sm text-blue-800">
              This persona is not fixed. As you complete more journeys, the system detects new patterns in your behavior
              and adjusts your profile. If your commuting style changes, so will your persona classification.
            </p>
            <p className="text-xs text-blue-700 font-mono bg-white p-3 rounded border border-blue-200">
              Persona is recalculated based on: speed preference, reroute tendency, crowd tolerance, transfer tolerance,
              and risk acceptance
            </p>
          </div>

          {/* Understanding Each Persona */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg text-zinc-900">Understanding Each Persona</h2>

            <div className="space-y-3">
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <h4 className="font-semibold text-red-900 mb-2">🚀 RUSHER</h4>
                <p className="text-sm text-red-800">
                  Speed-focused commuter. Willing to take risks for time savings. Frequently reroutes if faster option
                  appears. Tolerates crowds and transfers.
                </p>
              </div>

              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <h4 className="font-semibold text-blue-900 mb-2">🛡️ SAFE_PLANNER</h4>
                <p className="text-sm text-blue-800">
                  Reliability-focused commuter. Prefers proven routes with high confidence scores. Minimal rerouting.
                  Avoids risk and uncertainty.
                </p>
              </div>

              <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                <h4 className="font-semibold text-purple-900 mb-2">💜 COMFORT_SEEKER</h4>
                <p className="text-sm text-purple-800">
                  Comfort-focused commuter. Avoids crowds and minimizes transfers. Willing to take longer routes for
                  better experience. Stress-averse.
                </p>
              </div>

              <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                <h4 className="font-semibold text-green-900 mb-2">🧭 EXPLORER</h4>
                <p className="text-sm text-green-800">
                  Flexible commuter. Willing to try different routes. Balances multiple factors. Adaptable to changing
                  conditions. Not bound by habit.
                </p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-zinc-900 text-white rounded-lg p-8 space-y-4 text-center">
            <h3 className="font-semibold text-xl">Ready to Optimize Your Commute?</h3>
            <p className="text-zinc-300">
              Use the dashboard to explore routes selected specifically for your commute style. The system learns from
              every journey you take.
            </p>
            <Link
              href="/dashboard"
              className="inline-block bg-white text-zinc-900 px-6 py-2 rounded-lg font-semibold hover:bg-zinc-100 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
