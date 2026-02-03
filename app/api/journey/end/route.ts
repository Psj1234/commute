import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { journeyId } = await request.json();

    if (!journeyId) {
      return NextResponse.json({ error: "journeyId required" }, { status: 400 });
    }

    // Mark journey as complete
    const journey = await prisma.journey.update({
      where: { id: journeyId },
      data: {
        completed: true,
        end_time: new Date(),
      },
    });

    return NextResponse.json(journey);
  } catch (error) {
    console.error("Error ending journey:", error);
    return NextResponse.json({ error: "Failed to end journey" }, { status: 500 });
  }
}
