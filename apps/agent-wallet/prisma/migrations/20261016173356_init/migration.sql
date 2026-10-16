-- CreateTable
CREATE TABLE "Owner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "authServer" TEXT NOT NULL,
    "resourceServer" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "assetScale" INTEGER NOT NULL,
    "mcpApiKeyHash" TEXT NOT NULL,
    "maxPriceMinor" INTEGER NOT NULL,
    "allowedMerchants" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Agent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Grant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "budgetMinor" INTEGER NOT NULL,
    "interval" TEXT NOT NULL,
    "continueUri" TEXT NOT NULL,
    "continueToken" TEXT NOT NULL,
    "clientNonce" TEXT NOT NULL,
    "interactFinish" TEXT NOT NULL,
    "accessToken" TEXT,
    "manageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Grant_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "incomingUrl" TEXT NOT NULL,
    "merchantWallet" TEXT NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "quoteUrl" TEXT,
    "debitMinor" INTEGER,
    "outgoingPaymentUrl" TEXT,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_mcpApiKeyHash_key" ON "Agent"("mcpApiKeyHash");

-- CreateIndex
CREATE INDEX "Grant_agentId_status_idx" ON "Grant"("agentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_agentId_incomingUrl_key" ON "Payment"("agentId", "incomingUrl");
