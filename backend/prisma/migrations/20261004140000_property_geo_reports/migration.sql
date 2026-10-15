-- AlterTable Property: geo + report flag
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "isReported" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Property_latitude_longitude_idx" ON "Property"("latitude", "longitude");

-- Enum + table ListingReport
DO $$ BEGIN
  CREATE TYPE "ReportTargetType" AS ENUM ('PROPERTY', 'PRODUCT', 'PROVIDER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "ListingReport" (
    "id" SERIAL NOT NULL,
    "authorId" INTEGER NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" INTEGER NOT NULL,
    "reason" VARCHAR(100) NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ListingReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ListingReport_authorId_targetType_targetId_key"
  ON "ListingReport"("authorId", "targetType", "targetId");

CREATE INDEX IF NOT EXISTS "ListingReport_targetType_targetId_idx"
  ON "ListingReport"("targetType", "targetId");

CREATE INDEX IF NOT EXISTS "ListingReport_createdAt_idx"
  ON "ListingReport"("createdAt");

DO $$ BEGIN
  ALTER TABLE "ListingReport"
    ADD CONSTRAINT "ListingReport_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
