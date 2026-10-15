-- STUD Partners (gérés par l'admin)
CREATE TABLE IF NOT EXISTS "Partner" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "offer" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "discount" VARCHAR(30),
    "promoCode" VARCHAR(50),
    "logoUrl" VARCHAR(500) NOT NULL,
    "coverUrl" VARCHAR(500),
    "websiteUrl" VARCHAR(500),
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "city" VARCHAR(100),
    "address" VARCHAR(500),
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Partner_isActive_sortOrder_idx" ON "Partner"("isActive", "sortOrder");
CREATE INDEX IF NOT EXISTS "Partner_category_idx" ON "Partner"("category");
