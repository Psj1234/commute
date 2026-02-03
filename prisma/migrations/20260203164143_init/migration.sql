-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('DELAY', 'IDLE', 'REROUTE');

-- CreateEnum
CREATE TYPE "PersonaType" AS ENUM ('RUSHER', 'SAFE_PLANNER', 'COMFORT_SEEKER', 'EXPLORER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Journey" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "planned_route" TEXT NOT NULL,
    "final_route" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Journey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "journey_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "event_type" "EventType" NOT NULL,
    "wait_time" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationTimeStats" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "time_window" TEXT NOT NULL,
    "avg_wait_time" DOUBLE PRECISION NOT NULL,
    "delay_probability" DOUBLE PRECISION NOT NULL,
    "reroute_rate" DOUBLE PRECISION NOT NULL,
    "failure_score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "LocationTimeStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteConfidence" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "time_window" TEXT NOT NULL,
    "rci_score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RouteConfidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPersona" (
    "user_id" TEXT NOT NULL,
    "persona_type" "PersonaType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPersona_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "Journey" ADD CONSTRAINT "Journey_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "Journey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPersona" ADD CONSTRAINT "UserPersona_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
