import type { SessionParticipantEntry, SessionPresenceInterval } from "../db/models.js";

export type ParticipantKey = Pick<SessionParticipantEntry, "userId" | "identityType">;

function sameIdentity(a: ParticipantKey, b: ParticipantKey): boolean {
  return a.userId === b.userId && a.identityType === b.identityType;
}

export function isParticipantConnected(entry: SessionParticipantEntry): boolean {
  return hasOpenInterval(entry);
}

function hasOpenInterval(entry: SessionParticipantEntry): boolean {
  return (entry.intervals ?? []).some((interval) => interval.leftAt === null);
}

export function upsertJoinedParticipant(
  participants: SessionParticipantEntry[],
  joined: SessionParticipantEntry,
  at: Date,
): SessionParticipantEntry[] {
  const atIso = at.toISOString();
  const index = participants.findIndex((participant) => sameIdentity(participant, joined));
  if (index === -1) {
    return [...participants, { ...joined, intervals: [{ joinedAt: atIso, leftAt: null }] }];
  }
  const existing = participants[index];
  const intervals = existing.intervals ?? [];
  const updated: SessionParticipantEntry = {
    ...existing,
    displayName: joined.displayName,
    initials: joined.initials,
    role: joined.role,
    intervals: hasOpenInterval(existing) ? intervals : [...intervals, { joinedAt: atIso, leftAt: null }],
  };
  return participants.map((participant, i) => (i === index ? updated : participant));
}

export function markParticipantDeparted(
  participants: SessionParticipantEntry[],
  departed: ParticipantKey,
  at: Date,
): SessionParticipantEntry[] {
  const atIso = at.toISOString();
  return participants.map((participant) =>
    sameIdentity(participant, departed) ? { ...participant, intervals: closeIntervals(participant.intervals, atIso) } : participant,
  );
}

export function closeAllParticipants(participants: SessionParticipantEntry[], at: Date): SessionParticipantEntry[] {
  const atIso = at.toISOString();
  return participants.map((participant) => ({ ...participant, intervals: closeIntervals(participant.intervals, atIso) }));
}

function closeIntervals(intervals: SessionPresenceInterval[] | undefined, atIso: string): SessionPresenceInterval[] | undefined {
  return intervals?.map((interval) => (interval.leftAt === null ? { ...interval, leftAt: atIso } : interval));
}

export function reassignGuestParticipant(
  participants: SessionParticipantEntry[],
  guestId: string,
  userId: string,
): { participants: SessionParticipantEntry[]; changed: boolean } {
  const guestKey: ParticipantKey = { userId: guestId, identityType: "guest" };
  const userKey: ParticipantKey = { userId, identityType: "user" };
  const guestEntry = participants.find((participant) => sameIdentity(participant, guestKey));
  if (!guestEntry) {
    return { participants, changed: false };
  }
  const userEntry = participants.find((participant) => sameIdentity(participant, userKey));
  const remaining = participants.filter((participant) => !sameIdentity(participant, guestKey));
  if (!userEntry) {
    return {
      participants: [...remaining, { ...guestEntry, userId, identityType: "user" }],
      changed: true,
    };
  }
  const mergedIntervals = [...(userEntry.intervals ?? []), ...(guestEntry.intervals ?? [])].sort(
    (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime(),
  );
  return {
    participants: remaining.map((participant) =>
      sameIdentity(participant, userKey)
        ? { ...participant, intervals: mergedIntervals.length > 0 ? mergedIntervals : undefined }
        : participant,
    ),
    changed: true,
  };
}

function intervalEnd(interval: SessionPresenceInterval, fallbackEnd: Date): number {
  return interval.leftAt ? new Date(interval.leftAt).getTime() : fallbackEnd.getTime();
}

export function participantsOverlapped(
  a: SessionParticipantEntry,
  b: SessionParticipantEntry,
  sessionEnd: Date,
): boolean {
  const aIntervals = a.intervals ?? [];
  const bIntervals = b.intervals ?? [];
  return aIntervals.some((left) =>
    bIntervals.some((right) => {
      const leftStart = new Date(left.joinedAt).getTime();
      const rightStart = new Date(right.joinedAt).getTime();
      return leftStart < intervalEnd(right, sessionEnd) && rightStart < intervalEnd(left, sessionEnd);
    }),
  );
}

export function deriveInitials(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return "?";
  }
  const parts = trimmed.split(/\s+/);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : trimmed.slice(0, 2);
  return initials.toUpperCase();
}
