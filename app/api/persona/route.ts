import { NextRequest, NextResponse } from "next/server";
import { generateSimulatedJourneyStats } from "@/app/lib/simulated-data";
import { inferPersona } from "@/app/lib/intelligence-engine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Generate simulated persona for demo
    const simulatedStats = generateSimulatedJourneyStats();

    // Pick a persona based on userId hash for consistency
    const userIdHash = userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const profiles = Object.entries(simulatedStats);
    const selectedProfile = profiles[userIdHash % profiles.length][1];

    const { persona: personaType, scores, confidence } = inferPersona(selectedProfile);

    return NextResponse.json({
      user_id: userId,
      persona: {
        type: personaType,
        confidence,
        scores: {
          rusher: scores.rusher,
          safePlanner: scores.safePlanner,
          comfortSeeker: scores.comfortSeeker,
          explorer: scores.explorer,
        },
      },
      journeyCount: Math.floor(Math.random() * 20) + 5,
    });
  } catch (error) {
    console.error("Error fetching persona:", error);
    return NextResponse.json({ error: "Failed to fetch persona" }, { status: 500 });
  }
}
