import type { PresenceStatus, ShareWorkspaceInfo, WorkspaceMember } from "../types/workspace";

export const HEADER_PRESENCE_DOTS: PresenceStatus[] = ["online", "online", "idle"];
export const HEADER_PRESENCE_OVERFLOW_COUNT = 2;

export const MOCK_WORKSPACE_MEMBERS: WorkspaceMember[] = [
  {
    id: "member-lead-architect",
    initials: "L",
    name: "Lead Architect",
    email: "owner@difflane.io",
    role: "owner",
    presence: "offline",
  },
  {
    id: "member-frontend-engineer",
    initials: "F",
    name: "Frontend Engineer",
    email: "fe@difflane.io",
    role: "reviewer",
    presence: "online",
  },
  {
    id: "member-backend-engineer",
    initials: "B",
    name: "Backend Engineer",
    email: "be@difflane.io",
    role: "reviewer",
    presence: "offline",
  },
];

export const MOCK_SHARE_WORKSPACE_INFO: ShareWorkspaceInfo = {
  projectName: "Sample Project",
  isLive: true,
  roomCode: "ROOM-XXXX",
  inviteLink: "difflane.io/r/ROOM-XXXX",
  collaboratorCount: 3,
};
