-- CreateTable
CREATE TABLE "AgentOwner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "walletOwnerId" TEXT NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "apiKeyLast4" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentOwner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentOwner_walletOwnerId_key" ON "AgentOwner"("walletOwnerId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentOwner_apiKeyHash_key" ON "AgentOwner"("apiKeyHash");
