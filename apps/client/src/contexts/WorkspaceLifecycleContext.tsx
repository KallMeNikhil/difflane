import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { WorkspaceSnapshotSummary } from "@difflane/shared-types";
import * as WorkspaceLifecycleService from "../services/WorkspaceLifecycleService";
import { WorkspaceLifecycleContext, type WorkspaceLifecycleContextValue } from "../hooks/useWorkspaceLifecycle";
import { useRoom } from "../hooks/useRoom";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { clearRecoveryMarker, readRecoveryMarker, writeRecoveryMarker, type RecoveryMarker } from "../lib/persistence/recoveryCache";

interface WorkspaceFileSystemEntryLike {
  type: "file" | "folder";
}

export function WorkspaceLifecycleProvider({ children }: { children: ReactNode }) {
  const { roomCode, doc, persistenceStatus } = useRoom();
  const { guestId } = useCurrentUser();

  const [snapshots, setSnapshots] = useState<WorkspaceSnapshotSummary[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [recoveryPrompt, setRecoveryPrompt] = useState<RecoveryMarker | null>(null);
  const [recoveryConflictAt, setRecoveryConflictAt] = useState<string | null>(null);
  const hasCheckedRecovery = useRef(false);

  useEffect(() => {
    if (hasCheckedRecovery.current || !roomCode) {
      return;
    }
    hasCheckedRecovery.current = true;
    const marker = readRecoveryMarker(roomCode);
    if (!marker) {
      return;
    }
    setRecoveryPrompt(marker);
    WorkspaceLifecycleService.fetchRecoveryStatus(roomCode, guestId)
      .then((status) => {
        if (status.hasPersistedState && status.lastPersistedAt && new Date(status.lastPersistedAt) > new Date(marker.savedAt)) {
          setRecoveryConflictAt(status.lastPersistedAt);
        }
      })
      .catch(() => undefined);
  }, [roomCode, guestId]);

  useEffect(() => {
    if (!doc || !roomCode) {
      return;
    }

    function handleBeforeUnload() {
      const entries = [...doc!.getMap<WorkspaceFileSystemEntryLike>("workspaceFileSystem").values()];
      const metadata = doc!.getMap("workspaceMetadata");
      if (persistenceStatus === "saved") {
        clearRecoveryMarker(roomCode);
        return;
      }
      const marker: RecoveryMarker = {
        workspaceCode: roomCode,
        workspaceName: (metadata.get("name") as string | undefined) ?? roomCode,
        savedAt: new Date().toISOString(),
        reason: "unexpected-shutdown",
        fileCount: entries.filter((entry) => entry.type === "file").length,
        folderCount: entries.filter((entry) => entry.type === "folder").length,
        unsyncedCount: 1,
        repository: null,
      };
      writeRecoveryMarker(marker);
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [doc, roomCode, persistenceStatus]);

  const refreshSnapshots = useCallback(async () => {
    if (!roomCode) {
      return;
    }
    setIsLoadingSnapshots(true);
    try {
      const result = await WorkspaceLifecycleService.listSnapshots(roomCode, guestId);
      setSnapshots(result);
    } finally {
      setIsLoadingSnapshots(false);
    }
  }, [roomCode, guestId]);

  const createSnapshot = useCallback(
    async (label: string) => {
      await WorkspaceLifecycleService.createSnapshot(roomCode, label, guestId);
      await refreshSnapshots();
    },
    [roomCode, guestId, refreshSnapshots],
  );

  const renameSnapshot = useCallback(
    async (snapshotId: string, label: string) => {
      await WorkspaceLifecycleService.renameSnapshot(roomCode, snapshotId, label, guestId);
      await refreshSnapshots();
    },
    [roomCode, guestId, refreshSnapshots],
  );

  const deleteSnapshot = useCallback(
    async (snapshotId: string) => {
      await WorkspaceLifecycleService.deleteSnapshot(roomCode, snapshotId, guestId);
      await refreshSnapshots();
    },
    [roomCode, guestId, refreshSnapshots],
  );

  const restoreSnapshot = useCallback(
    async (snapshotId: string) => {
      await WorkspaceLifecycleService.restoreSnapshot(roomCode, snapshotId, guestId);
    },
    [roomCode, guestId],
  );

  const exportWorkspace = useCallback(async () => {
    setIsExporting(true);
    try {
      return await WorkspaceLifecycleService.exportWorkspace(roomCode, guestId);
    } finally {
      setIsExporting(false);
    }
  }, [roomCode, guestId]);

  const dismissRecoveryPrompt = useCallback(() => {
    setRecoveryPrompt(null);
    setRecoveryConflictAt(null);
    if (roomCode) {
      clearRecoveryMarker(roomCode);
    }
  }, [roomCode]);

  const discardRecovery = dismissRecoveryPrompt;

  const value = useMemo<WorkspaceLifecycleContextValue>(
    () => ({
      snapshots,
      isLoadingSnapshots,
      refreshSnapshots,
      createSnapshot,
      renameSnapshot,
      deleteSnapshot,
      restoreSnapshot,
      isExporting,
      exportWorkspace,
      recoveryPrompt,
      recoveryConflictAt,
      dismissRecoveryPrompt,
      discardRecovery,
    }),
    [
      snapshots,
      isLoadingSnapshots,
      refreshSnapshots,
      createSnapshot,
      renameSnapshot,
      deleteSnapshot,
      restoreSnapshot,
      isExporting,
      exportWorkspace,
      recoveryPrompt,
      recoveryConflictAt,
      dismissRecoveryPrompt,
      discardRecovery,
    ],
  );

  return <WorkspaceLifecycleContext.Provider value={value}>{children}</WorkspaceLifecycleContext.Provider>;
}
