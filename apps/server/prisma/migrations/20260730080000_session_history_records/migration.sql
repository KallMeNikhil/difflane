-- CreateEnum
CREATE TYPE "SessionRecordStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateTable
CREATE TABLE "session_history_records" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "status" "SessionRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "folderCount" INTEGER NOT NULL DEFAULT 0,
    "participants" JSONB NOT NULL,
    "timeline" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_history_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_history_records_workspaceId_startedAt_idx" ON "session_history_records"("workspaceId", "startedAt");

-- CreateIndex
CREATE INDEX "session_history_records_workspaceId_roomCode_status_idx" ON "session_history_records"("workspaceId", "roomCode", "status");

-- AddForeignKey
ALTER TABLE "session_history_records" ADD CONSTRAINT "session_history_records_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
