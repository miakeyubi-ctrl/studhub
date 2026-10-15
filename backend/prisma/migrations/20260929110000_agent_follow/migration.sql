-- Agent follow: recevoir les alertes quand un agent publie
CREATE TABLE IF NOT EXISTS "AgentFollow" (
  "id" SERIAL PRIMARY KEY,
  "agentId" INTEGER NOT NULL,
  "followerAgentId" INTEGER,
  "followerUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentFollow_agentId_fkey"
    FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AgentFollow_followerAgentId_fkey"
    FOREIGN KEY ("followerAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AgentFollow_followerUserId_fkey"
    FOREIGN KEY ("followerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgentFollow_agentId_followerAgentId_key"
  ON "AgentFollow"("agentId", "followerAgentId");

CREATE UNIQUE INDEX IF NOT EXISTS "AgentFollow_agentId_followerUserId_key"
  ON "AgentFollow"("agentId", "followerUserId");

CREATE INDEX IF NOT EXISTS "AgentFollow_agentId_idx" ON "AgentFollow"("agentId");
CREATE INDEX IF NOT EXISTS "AgentFollow_followerAgentId_idx" ON "AgentFollow"("followerAgentId");
CREATE INDEX IF NOT EXISTS "AgentFollow_followerUserId_idx" ON "AgentFollow"("followerUserId");
