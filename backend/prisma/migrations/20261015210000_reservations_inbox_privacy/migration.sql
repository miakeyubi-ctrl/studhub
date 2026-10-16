-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InboxNotifType" AS ENUM ('MESSAGE', 'SYSTEM', 'FAVORITE', 'PROMO', 'ALERT', 'CALL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "pushEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "personalizedTips" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN "pushEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Agent" ADD COLUMN "personalizedTips" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "PropertyReservation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxNotification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "agentId" INTEGER,
    "type" "InboxNotifType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT,
    "route" VARCHAR(300),
    "read" BOOLEAN NOT NULL DEFAULT false,
    "count" INTEGER NOT NULL DEFAULT 1,
    "clientKey" VARCHAR(120),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboxNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyReservation_userId_status_idx" ON "PropertyReservation"("userId", "status");

-- CreateIndex
CREATE INDEX "PropertyReservation_propertyId_idx" ON "PropertyReservation"("propertyId");

-- CreateIndex
CREATE INDEX "InboxNotification_userId_createdAt_idx" ON "InboxNotification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "InboxNotification_agentId_createdAt_idx" ON "InboxNotification"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "InboxNotification_userId_clientKey_idx" ON "InboxNotification"("userId", "clientKey");

-- CreateIndex
CREATE INDEX "InboxNotification_agentId_clientKey_idx" ON "InboxNotification"("agentId", "clientKey");

-- AddForeignKey
ALTER TABLE "PropertyReservation" ADD CONSTRAINT "PropertyReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyReservation" ADD CONSTRAINT "PropertyReservation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxNotification" ADD CONSTRAINT "InboxNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxNotification" ADD CONSTRAINT "InboxNotification_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
