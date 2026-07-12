import type { WorkspaceMember } from "../types/workspace";

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
