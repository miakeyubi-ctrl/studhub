-- Annonces publiées par le compte partenaire uniquement
CREATE TABLE IF NOT EXISTS "PartnerAnnouncement" (
    "id" SERIAL NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "discount" VARCHAR(30),
    "promoCode" VARCHAR(50),
    "imageUrl" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerAnnouncement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PartnerAnnouncement_partnerId_isActive_createdAt_idx"
  ON "PartnerAnnouncement"("partnerId", "isActive", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PartnerAnnouncement_partnerId_fkey'
  ) THEN
    ALTER TABLE "PartnerAnnouncement"
      ADD CONSTRAINT "PartnerAnnouncement_partnerId_fkey"
      FOREIGN KEY ("partnerId") REFERENCES "Partner"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
