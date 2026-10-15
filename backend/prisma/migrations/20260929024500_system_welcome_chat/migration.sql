-- System welcome conversations (non-replyable StudHub team messages)

DO $$ BEGIN
  ALTER TYPE "ConversationType" ADD VALUE 'SYSTEM';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "allowReplies" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Conversation_studentId_type_idx" ON "Conversation"("studentId", "type");
