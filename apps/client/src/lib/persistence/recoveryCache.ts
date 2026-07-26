const STORAGE_PREFIX = "difflane:recovery:";
const LAST_ACTIVE_KEY = "difflane:recovery:last-active";

export interface RecoveryMarker {
  workspaceCode: string;
  workspaceName: string;
  savedAt: string;
  reason: "heartbeat" | "unexpected-shutdown";
  fileCount: number;
  folderCount: number;
  unsyncedCount: number;
  repository: { provider: string; owner: string; name: string; branch: string } | null;
}

function safeParse(value: string | null): RecoveryMarker | null {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as RecoveryMarker;
  } catch {
    return null;
  }
}

export function writeRecoveryMarker(marker: RecoveryMarker): void {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${marker.workspaceCode}`, JSON.stringify(marker));
    window.localStorage.setItem(LAST_ACTIVE_KEY, marker.workspaceCode);
  } catch {
    /* localStorage unavailable; recovery marker is best-effort only */
  }
}

export function readRecoveryMarker(workspaceCode: string): RecoveryMarker | null {
  try {
    return safeParse(window.localStorage.getItem(`${STORAGE_PREFIX}${workspaceCode}`));
  } catch {
    return null;
  }
}

export function clearRecoveryMarker(workspaceCode: string): void {
  try {
    window.localStorage.removeItem(`${STORAGE_PREFIX}${workspaceCode}`);
  } catch {
    /* localStorage unavailable */
  }
}

export function markCleanExit(workspaceCode: string): void {
  clearRecoveryMarker(workspaceCode);
}

export function readLastActiveWorkspaceCode(): string | null {
  try {
    return window.localStorage.getItem(LAST_ACTIVE_KEY);
  } catch {
    return null;
  }
}
