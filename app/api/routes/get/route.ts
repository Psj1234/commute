import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Fetch recently generated routes from database (last 10)
    const routes = await prisma.route.findMany({
      include: {
        confidence: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (!routes.length) {
      return NextResponse.json({
        routes: [],
        recommendedRoute: null,
        message: "No routes found. Select locations on the dashboard to generate routes.",
      });
    }

    // Map database routes to response format
    const enhancedRoutes = routes.map((route) => ({
      id: route.id,
      name: route.name,
      distance: route.distance,
      baseEta: route.base_eta,
      geometry: route.geometry,
      start_lat: route.start_lat,
      start_lng: route.start_lng,
      end_lat: route.end_lat,
      end_lng: route.end_lng,
      rciScore: route.confidence?.[0]?.rci_score || 0.5,
      failureScore: 0.3, // Mock value
      crowdLevel: 0.5, // Mock value
    }));

    // Sort by RCI (highest first)
    enhancedRoutes.sort((a, b) => b.rciScore - a.rciScore);

    return NextResponse.json({
      routes: enhancedRoutes,
      recommendedRoute: enhancedRoutes[0],
    });
  } catch (error) {
    console.error("Error fetching routes:", error);
    return NextResponse.json({ error: "Failed to fetch routes" }, { status: 500 });
  }
}
