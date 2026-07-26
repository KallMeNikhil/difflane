import type {
  CreateRoomFormErrors,
  CreateRoomFormValues,
  JoinRoomFormErrors,
  JoinRoomFormValues,
} from "../types/room";

const ROOM_CODE_PATTERN = /^[A-Z0-9]{5,8}$/;
const INVITATION_LINK_PATTERN = /^https?:\/\/\S+\/room\/\S+$/i;

export const ROOM_NAME_MAX_LENGTH = 80;
export const DESCRIPTION_MAX_LENGTH = 280;
export const DISPLAY_NAME_MAX_LENGTH = 40;

export function validateCreateRoomForm(values: CreateRoomFormValues): CreateRoomFormErrors {
  const errors: CreateRoomFormErrors = {};

  const trimmedName = values.roomName.trim();
  if (!trimmedName) {
    errors.roomName = "Workspace name is required.";
  } else if (trimmedName.length > ROOM_NAME_MAX_LENGTH) {
    errors.roomName = `Workspace name must be ${ROOM_NAME_MAX_LENGTH} characters or fewer.`;
  }

  if (values.description.trim().length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  }

  if (!values.programmingLanguage) {
    errors.programmingLanguage = "Select a programming language.";
  }

  return errors;
}

export function validateJoinRoomForm(values: JoinRoomFormValues): JoinRoomFormErrors {
  const errors: JoinRoomFormErrors = {};

  const trimmedDisplayName = values.displayName.trim();
  if (!trimmedDisplayName) {
    errors.displayName = "Display name is required.";
  } else if (trimmedDisplayName.length > DISPLAY_NAME_MAX_LENGTH) {
    errors.displayName = `Display name must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`;
  }

  const trimmedRoomCode = values.roomCode.trim();
  const trimmedInvitationLink = values.invitationLink.trim();
  const hasRoomCode = trimmedRoomCode.length > 0;
  const hasInvitationLink = trimmedInvitationLink.length > 0;

  if (!hasRoomCode && !hasInvitationLink) {
    errors.form = "Enter a workspace code or an invitation link.";
  } else if (hasRoomCode && !ROOM_CODE_PATTERN.test(trimmedRoomCode.toUpperCase())) {
    errors.roomCode = "Workspace codes are 5-8 letters and numbers.";
  } else if (!hasRoomCode && hasInvitationLink && !INVITATION_LINK_PATTERN.test(trimmedInvitationLink)) {
    errors.invitationLink = "Enter a valid Difflane workspace invitation link.";
  }

  return errors;
}
