
export type MaxParticipants = "10" | "25" | "50" | "unlimited";
export type ProgrammingLanguage =
  | "typescript"
  | "javascript"
  | "python"
  | "java"
  | "go"
  | "rust"
  | "csharp"
  | "cpp"
  | "ruby"
  | "php"
  | "other";

export interface CreateRoomFeatureToggles {
  cursorPresence: boolean;
  inlineDiscussions: boolean;
  sharedNavigation: boolean;
}

export interface CreateRoomFormValues {
  roomName: string;
  description: string;
  programmingLanguage: ProgrammingLanguage;
  maxParticipants: MaxParticipants;
  features: CreateRoomFeatureToggles;
}

export type CreateRoomFormErrors = Partial<
  Record<"roomName" | "description" | "programmingLanguage", string>
>;

export interface CreatedRoomResult {
  roomCode: string;
}

export interface JoinRoomFormValues {
  displayName: string;
  roomCode: string;
  invitationLink: string;
}

export type JoinRoomFormErrors = Partial<
  Record<"displayName" | "roomCode" | "invitationLink" | "form", string>
>;

export interface QuickJoinRoom {
  id: string;
  name: string;
  hostName?: string;
  joinedLabel: string;
}
