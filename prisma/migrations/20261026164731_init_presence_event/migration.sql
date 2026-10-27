-- CreateEnum
CREATE TYPE "PresenceEventType" AS ENUM ('ENTER', 'EXIT');

-- CreateTable
CREATE TABLE "presence_events" (
    "id" TEXT NOT NULL,
    "type" "PresenceEventType" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presence_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "presence_events_createdAt_idx" ON "presence_events"("createdAt");
