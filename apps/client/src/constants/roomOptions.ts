import type { MaxParticipants, ProgrammingLanguage } from "../types/room";

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

export const MAX_PARTICIPANTS_OPTIONS: { value: MaxParticipants; label: string }[] = [
  { value: "10", label: "Up to 10" },
  { value: "25", label: "Up to 25" },
  { value: "50", label: "Up to 50" },
  { value: "unlimited", label: "Unlimited" },
];
