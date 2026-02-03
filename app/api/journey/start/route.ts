import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Create or get user
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      user = await prisma.user.create({ data: { id: userId } });
    }

    // Create journey
    const journey = await prisma.journey.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        planned_route_id: "route-express",
        final_route_id: "route-express",
        start_time: new Date(),
      },
    });

    return NextResponse.json(journey);
  } catch (error) {
    console.error("Error starting journey:", error);
    return NextResponse.json({ error: "Failed to start journey" }, { status: 500 });
  }
}
