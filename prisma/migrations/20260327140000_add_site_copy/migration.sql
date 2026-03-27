-- Site-wide editable copy (singleton row)
CREATE TABLE "SiteCopy" (
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteCopy_pkey" PRIMARY KEY ("id")
);
