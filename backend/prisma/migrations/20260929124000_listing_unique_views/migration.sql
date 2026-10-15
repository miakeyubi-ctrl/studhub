-- CreateTable
CREATE TABLE IF NOT EXISTS "PropertyView" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "agentId" INTEGER,
    "viewerKey" VARCHAR(64),
    "propertyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductView" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "viewerKey" VARCHAR(64),
    "productId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PropertyView_userId_propertyId_key" ON "PropertyView"("userId", "propertyId");
CREATE UNIQUE INDEX IF NOT EXISTS "PropertyView_agentId_propertyId_key" ON "PropertyView"("agentId", "propertyId");
CREATE UNIQUE INDEX IF NOT EXISTS "PropertyView_viewerKey_propertyId_key" ON "PropertyView"("viewerKey", "propertyId");
CREATE INDEX IF NOT EXISTS "PropertyView_propertyId_idx" ON "PropertyView"("propertyId");

CREATE UNIQUE INDEX IF NOT EXISTS "ProductView_userId_productId_key" ON "ProductView"("userId", "productId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductView_viewerKey_productId_key" ON "ProductView"("viewerKey", "productId");
CREATE INDEX IF NOT EXISTS "ProductView_productId_idx" ON "ProductView"("productId");

DO $$ BEGIN
  ALTER TABLE "PropertyView" ADD CONSTRAINT "PropertyView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PropertyView" ADD CONSTRAINT "PropertyView_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PropertyView" ADD CONSTRAINT "PropertyView_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProductView" ADD CONSTRAINT "ProductView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProductView" ADD CONSTRAINT "ProductView_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
