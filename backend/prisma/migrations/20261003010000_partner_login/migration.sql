-- Role PARTNER + compte connexion partenaire (email / mot de passe)

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PARTNER';

ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "loginEmail" VARCHAR(255);
ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "passwordHash" VARCHAR(255);
ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "viewsCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "likesCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "clicksCount" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "Partner_loginEmail_key" ON "Partner"("loginEmail");

ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "partnerId" INTEGER;

CREATE INDEX IF NOT EXISTS "RefreshToken_partnerId_idx" ON "RefreshToken"("partnerId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RefreshToken_partnerId_fkey'
  ) THEN
    ALTER TABLE "RefreshToken"
      ADD CONSTRAINT "RefreshToken_partnerId_fkey"
      FOREIGN KEY ("partnerId") REFERENCES "Partner"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
