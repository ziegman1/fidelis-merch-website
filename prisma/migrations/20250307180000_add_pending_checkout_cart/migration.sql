-- CreateTable
CREATE TABLE "PendingCheckoutCart" (
    "id" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "cartJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingCheckoutCart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingCheckoutCart_stripeSessionId_key" ON "PendingCheckoutCart"("stripeSessionId");
