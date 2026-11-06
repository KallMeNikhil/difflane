import type { PresenceStatus } from "../components/common";
import type { SessionParticipant, SessionRecord } from "../types/session";
import { formatRelativeTimeLabel } from "./SessionHistoryService";

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

export function buildCollaborators(records: SessionRecord[], self: SelfIdentity, limit = 8): CollaboratorInsight[] {
  const byKey = new Map<string, CollaboratorInsight>();
  for (const record of records) {
    for (const participant of record.participants) {
      if (isSelf(participant, self) || !participant.overlappedWithViewer) {
        continue;
      }
      const key = `${participant.identityType ?? "user"}:${participant.id}`;
      const isOnline = participant.presence === "online";
      const existing = byKey.get(key);
      const candidate: CollaboratorInsight = {
        id: key,
        name: participant.name,
        initials: participant.initials,
        presence: isOnline ? "online" : "offline",
        workspaceName: record.title,
        roomCode: record.roomCode,
        lastSeenAt: record.lastActivityAt,
      };
      if (!existing) {
        byKey.set(key, candidate);
        continue;
      }
      const existingOnline = existing.presence === "online";
      const isNewer = new Date(candidate.lastSeenAt).getTime() > new Date(existing.lastSeenAt).getTime();
      if ((isOnline && !existingOnline) || (isOnline === existingOnline && isNewer)) {
        byKey.set(key, candidate);
      }
    }
  }
  return Array.from(byKey.values())
    .sort(
      (a, b) =>
        Number(b.presence === "online") - Number(a.presence === "online") ||
        new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime(),
    )
    .slice(0, limit);
}

export interface SelfIdentity {
  id: string;
  identityType: "user" | "guest";
}

function isSelf(participant: SessionParticipant, self: SelfIdentity): boolean {
  return participant.id === self.id && (participant.identityType ?? self.identityType) === self.identityType;
}

export function describeCollaboratorStatus(collaborator: CollaboratorInsight): string {
  return collaborator.presence === "online"
    ? `Active in ${collaborator.workspaceName}`
    : `${collaborator.workspaceName} · ${formatRelativeTimeLabel(collaborator.lastSeenAt)}`;
}
