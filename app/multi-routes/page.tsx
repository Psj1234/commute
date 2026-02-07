import React from "react";
import MultiRouteViewer from "@/app/components/MultiRouteViewer";

export const metadata = {
  title: "Multi-Route Comparison | Commute Intelligence",
  description: "Compare multiple routes ranked by your persona and current traffic conditions",
};

export default function MultiRoutePage() {
  return (
    <main className="min-h-screen bg-linear-to-br from-indigo-50 to-blue-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🔁 Multi-Route Comparison
          </h1>
          <p className="text-lg text-gray-700">
            Compare multiple routes for the same start and end locations, ranked by your preferred commute style and real-time traffic.
          </p>
        </div>

        {/* Key Points */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            {
              icon: "🗺️",
              title: "Multiple Routes",
              desc: "Road-only, Transit-only, Multi-modal options",
            },
            {
              icon: "🧭",
              title: "Persona-Based Ranking",
              desc: "Routes re-ranked for your commute style",
            },
            {
              icon: "📊",
              title: "Real-Time Traffic",
              desc: "Scores updated based on time and conditions",
            },
          ].map((point) => (
            <div
              key={point.title}
              className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-2">{point.icon}</div>
              <h3 className="font-semibold text-gray-900">{point.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{point.desc}</p>
            </div>
          ))}
        </div>

        {/* Demo Description */}
        <div className="mb-8 p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            📍 Demo Scenario: Andheri → CST
          </h2>
          <div className="space-y-4 text-gray-700">
            <div>
              <p className="font-semibold mb-2">🚗 Route 1: Road Only</p>
              <p className="text-sm bg-gray-50 p-2 rounded">
                Direct drive via Eastern Express Road (18.5 km, ~45 min)
              </p>
            </div>
            <div>
              <p className="font-semibold mb-2">🚆 Route 2: Train Only</p>
              <p className="text-sm bg-gray-50 p-2 rounded">
                Andheri → Dadar → CST (Central + Local train, 16.2 km, ~52 min)
              </p>
            </div>
            <div>
              <p className="font-semibold mb-2">🔁 Route 3: Multi-Modal</p>
              <p className="text-sm bg-gray-50 p-2 rounded">
                Andheri → Bandra (car) → Dadar → CST (train, 20.8 km, ~58 min)
              </p>
            </div>
            <p className="text-sm text-blue-600 font-semibold mt-4">
              💡 Tip: Try different personas and times to see how route rankings change!
            </p>
          </div>
        </div>

        {/* Interactive Component */}
        <div className="mb-8">
          <MultiRouteViewer initialPersona="SAFE_PLANNER" initialTime="09:30" initialStart="Andheri" initialEnd="CST" />
        </div>

        {/* How It Works */}
        <div className="p-6 bg-white rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">⚙️ How Multi-Route Ranking Works</h2>
          <div className="space-y-4 text-gray-700">
            <div className="flex gap-4">
              <div className="flex-shrink-0 text-2xl">1️⃣</div>
              <div>
                <p className="font-semibold">Existing Routes Identified</p>
                <p className="text-sm text-gray-600">
                  System recognizes all valid routes between start and end (road, transit, multi-modal)
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 text-2xl">2️⃣</div>
              <div>
                <p className="font-semibold">Traffic Patterns Applied</p>
                <p className="text-sm text-gray-600">
                  Each route's segments get traffic, crowd, and incident scores based on time of day
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 text-2xl">3️⃣</div>
              <div>
                <p className="font-semibold">Persona Scoring</p>
                <p className="text-sm text-gray-600">
                  Routes scored 0-1 based on how well they match your persona preferences
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 text-2xl">4️⃣</div>
              <div>
                <p className="font-semibold">Ranked & Displayed</p>
                <p className="text-sm text-gray-600">
                  Routes shown in order, with best match first and clear explanations
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Route Strategy Guide */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <h3 className="font-semibold text-orange-900 mb-2">⚡ Rusher's View</h3>
            <p className="text-sm text-orange-800">
              Road-only route ranks highest (despite traffic). Car preferred over transit crowds.
            </p>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">🛡️ Safe Planner's View</h3>
            <p className="text-sm text-green-800">
              Train-only route highest ranked (reliable in rush hour). Crowds acceptable for reliability.
            </p>
          </div>

          <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
            <h3 className="font-semibold text-pink-900 mb-2">🛋️ Comfort Seeker's View</h3>
            <p className="text-sm text-pink-800">
              Road-only preferred (private space). Will accept longer route for personal space.
            </p>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="font-semibold text-purple-900 mb-2">🧭 Explorer's View</h3>
            <p className="text-sm text-purple-800">
              Multi-modal route appealing (mixed experience). Values variety and local discovery.
            </p>
          </div>
        </div>

        {/* Technical Details */}
        <div className="p-6 bg-white rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📡 API Usage</h2>
          <p className="text-gray-700 mb-4">
            Get multiple routes for any start/end via the personalized routes API:
          </p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm overflow-x-auto">
            <code>
              GET /api/routes/personalized?start=Andheri&end=CST&persona=SAFE_PLANNER&time=09:30
            </code>
          </div>
          <p className="text-gray-600 text-sm mt-3">
            Returns array of routes ranked by persona score. Each route shows segments with coordinates, traffic patterns, and explanations.
          </p>
        </div>

        {/* Key Features */}
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">✨ Key Features</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex gap-2">
              <span className="text-lg">✅</span>
              <span><strong>Non-Breaking:</strong> Existing routes system untouched</span>
            </li>
            <li className="flex gap-2">
              <span className="text-lg">✅</span>
              <span><strong>Additive Layer:</strong> Persona ranking applied on top</span>
            </li>
            <li className="flex gap-2">
              <span className="text-lg">✅</span>
              <span><strong>Multiple Route Types:</strong> Road, Transit, Multi-modal</span>
            </li>
            <li className="flex gap-2">
              <span className="text-lg">✅</span>
              <span><strong>Real Coordinates:</strong> Actual Mumbai station locations</span>
            </li>
            <li className="flex gap-2">
              <span className="text-lg">✅</span>
              <span><strong>Time-Based Traffic:</strong> Patterns vary by hour</span>
            </li>
            <li className="flex gap-2">
              <span className="text-lg">✅</span>
              <span><strong>Transparent Explanations:</strong> Why each route ranked</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
