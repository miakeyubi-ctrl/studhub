-- Allow student↔student conversations (marketplace / feed contact)
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "peerStudentId" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Conversation_peerStudentId_fkey'
  ) THEN
    ALTER TABLE "Conversation"
      ADD CONSTRAINT "Conversation_peerStudentId_fkey"
      FOREIGN KEY ("peerStudentId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Conversation_peerStudentId_idx" ON "Conversation"("peerStudentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Conversation_studentId_peerStudentId_key'
  ) THEN
    ALTER TABLE "Conversation"
      ADD CONSTRAINT "Conversation_studentId_peerStudentId_key"
      UNIQUE ("studentId", "peerStudentId");
  END IF;
END $$;
