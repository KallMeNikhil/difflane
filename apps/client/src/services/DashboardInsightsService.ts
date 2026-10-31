import type { PresenceStatus } from "../components/common";
import type { SessionRecord } from "../types/session";
import { formatRelativeTimeLabel } from "./SessionHistoryService";

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export interface ActivityInsight {
  id: string;
  description: string;
  workspaceName: string;
  roomCode: string;
  occurredAt: string;
}

export interface CollaboratorInsight {
  id: string;
  name: string;
  initials: string;
  presence: PresenceStatus;
  workspaceName: string;
  roomCode: string;
  lastSeenAt: string;
}

export function buildRecentActivity(records: SessionRecord[], limit = 8): ActivityInsight[] {
  return records
    .flatMap((record) =>
      record.timeline.map((event) => ({
        id: `${record.id}-${event.id}`,
        description: event.description,
        workspaceName: record.title,
        roomCode: record.roomCode,
        occurredAt: event.occurredAt ?? record.lastActivityAt,
      })),
    )
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit);
}

export function buildCollaborators(records: SessionRecord[], selfId: string | null, now = Date.now(), limit = 8): CollaboratorInsight[] {
  const byId = new Map<string, CollaboratorInsight>();
  for (const record of records) {
    const isLive = record.status === "active" && now - new Date(record.lastActivityAt).getTime() < ONLINE_WINDOW_MS;
    for (const participant of record.participants) {
      if (participant.id === selfId) {
        continue;
      }
      const existing = byId.get(participant.id);
      const candidate: CollaboratorInsight = {
        id: participant.id,
        name: participant.name,
        initials: participant.initials,
        presence: isLive ? "online" : "offline",
        workspaceName: record.title,
        roomCode: record.roomCode,
        lastSeenAt: record.lastActivityAt,
      };
      const isNewer = !existing || new Date(candidate.lastSeenAt).getTime() > new Date(existing.lastSeenAt).getTime();
      if (isNewer || (isLive && existing?.presence !== "online")) {
        byId.set(participant.id, isNewer ? candidate : { ...existing!, presence: "online" });
      }
    }
  }
  return Array.from(byId.values())
    .sort((a, b) => Number(b.presence === "online") - Number(a.presence === "online") || new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime())
    .slice(0, limit);
}

export function describeCollaboratorStatus(collaborator: CollaboratorInsight): string {
  return collaborator.presence === "online"
    ? `Active in ${collaborator.workspaceName}`
    : `${collaborator.workspaceName} · ${formatRelativeTimeLabel(collaborator.lastSeenAt)}`;
}
