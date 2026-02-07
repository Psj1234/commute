import React from "react";
import PersonalizedRouteViewer from "@/app/components/PersonalizedRouteViewer";

export const metadata = {
  title: "Persona-Based Routing | Commute Intelligence",
  description: "Discover routes tailored to your commute style with real-time traffic awareness",
};

export default function PersonalizedRoutesPage() {
  return (
    <main className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🧭 Persona-Based Traffic-Aware Routing
          </h1>
          <p className="text-lg text-gray-700">
            The system doesn't generate new routes—it re-ranks existing ones based on your commute style and real-time traffic patterns.
          </p>
        </div>

        {/* Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {[
            {
              icon: "⚡",
              title: "Rusher",
              desc: "Fastest route with acceptable confidence",
            },
            {
              icon: "🛡️",
              title: "Safe Planner",
              desc: "Most reliable route (default)",
            },
            {
              icon: "🛋️",
              title: "Comfort Seeker",
              desc: "Least crowded, fewer transfers",
            },
            {
              icon: "🧭",
              title: "Explorer",
              desc: "Balanced & non-obvious routes",
            },
          ].map((persona) => (
            <div
              key={persona.title}
              className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-2">{persona.icon}</div>
              <h3 className="font-semibold text-gray-900">{persona.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{persona.desc}</p>
            </div>
          ))}
        </div>

        {/* Demo Description */}
        <div className="mb-8 p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📍 Demo: Mumbai Bandra → CST</h2>
          <div className="space-y-3 text-gray-700">
            <p>
              <span className="font-semibold">⏰ Departure Time:</span> 9:30 AM (Morning Rush Hour)
            </p>
            <p>
              <span className="font-semibold">📊 Mock Traffic Data:</span>
            </p>
            <ul className="ml-4 space-y-2">
              <li>🚗 Road traffic density: 0.91 🟥 (Heavy congestion on Western Express Road)</li>
              <li>🚆 Train crowd score: 0.68 🟨 (Moderate peak hour crowding)</li>
              <li>↔️ Mixed congestion triggers multi-modal preference</li>
            </ul>
            <p className="mt-4">
              <span className="font-semibold">✨ Result:</span> System recommends a smart multi-modal route
              combining car, train, and walk based on your persona and live traffic conditions.
            </p>
          </div>
        </div>

        {/* Interactive Component */}
        <div className="mb-8">
          <PersonalizedRouteViewer initialPersona="SAFE_PLANNER" initialTime="09:30" />
        </div>

        {/* How It Works */}
        <div className="p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🔧 How It Works</h2>
          <div className="space-y-4 text-gray-700">
            <div>
              <p className="font-semibold text-gray-900 mb-1">1️⃣ Existing Routes Untouched</p>
              <p className="text-sm">RCI (Route Confidence Index) and existing route data remain unchanged</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">2️⃣ Persona Detection</p>
              <p className="text-sm">
                System infers your commute style (Rusher, Safe Planner, Comfort Seeker, or Explorer)
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">3️⃣ Traffic Awareness</p>
              <p className="text-sm">
                Mock traffic data enriches route segments with density, crowd_score, and incident_rate
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">4️⃣ Smart Re-Ranking</p>
              <p className="text-sm">
                Routes are ranked based on persona preferences + real-time traffic patterns
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">5️⃣ Transparent Explanations</p>
              <p className="text-sm">
                Each recommendation includes detailed reasoning for better user trust
              </p>
            </div>
          </div>
        </div>

        {/* Traffic Signal Legend */}
        <div className="mt-8 p-6 bg-linear-to-r from-red-50 to-green-50 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🚦 Traffic Signal Indicators</h2>
          <p className="text-gray-700 mb-4">Visualize congestion & crowd using intuitive signals:</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-red-100 border-l-4 border-red-500 rounded">
              <p className="text-3xl font-bold">🟥</p>
              <p className="font-semibold text-red-900 mt-2">Red</p>
              <p className="text-sm text-red-800">Heavy congestion / high crowd</p>
            </div>
            <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 rounded">
              <p className="text-3xl font-bold">🟨</p>
              <p className="font-semibold text-yellow-900 mt-2">Yellow</p>
              <p className="text-sm text-yellow-800">Moderate flow</p>
            </div>
            <div className="p-4 bg-green-100 border-l-4 border-green-500 rounded">
              <p className="text-3xl font-bold">🟩</p>
              <p className="font-semibold text-green-900 mt-2">Green</p>
              <p className="text-sm text-green-800">Free flow / light crowd</p>
            </div>
          </div>
        </div>

        {/* Mode Preferences Table */}
        <div className="mt-8 p-6 bg-white rounded-lg shadow-lg overflow-x-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🧠 Persona + Traffic Based Mode Preference</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left font-semibold text-gray-900 p-2">Condition</th>
                <th className="text-left font-semibold text-gray-900 p-2">Preferred Mode(s)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="p-2">High road traffic (🟥)</td>
                <td className="p-2">🚆 Train / 🚇 Metro</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="p-2">High crowd density</td>
                <td className="p-2">🚗 Car / 🚕 Cab</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="p-2">Mixed congestion</td>
                <td className="p-2">🚗 Car → 🚆 Train → 🚶 Walk</td>
              </tr>
              <tr>
                <td className="p-2">Late night</td>
                <td className="p-2">🚕 Cab / 🚴 Bike</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 text-sm">
            🚀 This demo showcases how persona-based intelligence enhances route selection without
            modifying existing systems or generating new routes.
          </p>
        </div>
      </div>
    </main>
  );
}
