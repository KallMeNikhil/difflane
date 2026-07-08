import type { MaxParticipants, ProgrammingLanguage, ReviewMode, RoomVisibility } from "../types/room";

export const REVIEW_MODE_OPTIONS: {
  value: ReviewMode;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "live",
    label: "Live Collaboration",
    description: "Real-time sync, active cursors, instant updates.",
    icon: "group",
  },
  {
    value: "guided",
    label: "Guided Walkthrough",
    description: "Structured walkthrough with predefined steps.",
    icon: "route",
  },
  {
    value: "readonly",
    label: "Read Only",
    description: "Comments disabled, pure viewing mode.",
    icon: "visibility",
  },
];

export const PROGRAMMING_LANGUAGE_OPTIONS: { value: ProgrammingLanguage; label: string }[] = [
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "csharp", label: "C#" },
  { value: "cpp", label: "C++" },
  { value: "ruby", label: "Ruby" },
  { value: "php", label: "PHP" },
  { value: "other", label: "Other" },
];

export const VISIBILITY_OPTIONS: { value: RoomVisibility; label: string }[] = [
  { value: "private", label: "Private (Invite Only)" },
  { value: "team", label: "Team (Engineering)" },
  { value: "org", label: "Organization Wide" },
];

export const MAX_PARTICIPANTS_OPTIONS: { value: MaxParticipants; label: string }[] = [
  { value: "10", label: "Up to 10" },
  { value: "25", label: "Up to 25" },
  { value: "50", label: "Up to 50" },
  { value: "unlimited", label: "Unlimited" },
];
