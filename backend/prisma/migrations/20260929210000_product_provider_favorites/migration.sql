-- Favoris marketplace + StudServices
CREATE TABLE IF NOT EXISTS "ProductFavorite" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductFavorite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProviderFavorite" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "providerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProviderFavorite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductFavorite_userId_productId_key" ON "ProductFavorite"("userId", "productId");
CREATE INDEX IF NOT EXISTS "ProductFavorite_userId_idx" ON "ProductFavorite"("userId");
CREATE INDEX IF NOT EXISTS "ProductFavorite_productId_idx" ON "ProductFavorite"("productId");

CREATE UNIQUE INDEX IF NOT EXISTS "ProviderFavorite_userId_providerId_key" ON "ProviderFavorite"("userId", "providerId");
CREATE INDEX IF NOT EXISTS "ProviderFavorite_userId_idx" ON "ProviderFavorite"("userId");
CREATE INDEX IF NOT EXISTS "ProviderFavorite_providerId_idx" ON "ProviderFavorite"("providerId");

DO $$ BEGIN
  ALTER TABLE "ProductFavorite" ADD CONSTRAINT "ProductFavorite_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProductFavorite" ADD CONSTRAINT "ProductFavorite_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProviderFavorite" ADD CONSTRAINT "ProviderFavorite_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProviderFavorite" ADD CONSTRAINT "ProviderFavorite_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
