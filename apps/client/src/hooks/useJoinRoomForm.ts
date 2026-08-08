import { useCallback, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { validateJoinRoomForm } from "../services/RoomService";
import { buildWorkspacePath } from "../constants/routes";
import { useCurrentUser } from "./useCurrentUser";
import type { JoinRoomFormErrors, JoinRoomFormValues } from "../types/room";

const INITIAL_VALUES: JoinRoomFormValues = {
  displayName: "",
  roomCode: "",
  invitationLink: "",
};

export type JoinRoomStatus = "idle" | "joining";

function extractRoomCode(values: JoinRoomFormValues): string {
  const roomCode = values.roomCode.trim();
  if (roomCode) {
    return roomCode.toUpperCase();
  }
  const link = values.invitationLink.trim();
  const segments = link.split("/").filter(Boolean);
  return (segments[segments.length - 1] ?? "").toUpperCase();
}

export function useJoinRoomForm() {
  const navigate = useNavigate();
  const { isAuthenticated, setDisplayName } = useCurrentUser();
  const [values, setValues] = useState<JoinRoomFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<JoinRoomFormErrors>({});
  const [status, setStatus] = useState<JoinRoomStatus>("idle");

  const setField = useCallback(
    <K extends keyof JoinRoomFormValues>(key: K, value: JoinRoomFormValues[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));
    },
    [],
  );

  const joinWithCode = useCallback(
    (code: string) => {
      if (!isAuthenticated) {
        const trimmedDisplayName = values.displayName.trim();
        if (!trimmedDisplayName) {
          setErrors((prev) => ({ ...prev, displayName: "Display name is required." }));
          return;
        }
        setDisplayName(trimmedDisplayName);
      }

      setField("roomCode", code);
      setStatus("joining");
      window.setTimeout(() => {
        navigate(buildWorkspacePath(code));
      }, 400);
    },
    [isAuthenticated, values.displayName, setField, navigate, setDisplayName],
  );

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      const validationErrors = validateJoinRoomForm(values, isAuthenticated);
      setErrors(validationErrors);
      if (Object.keys(validationErrors).length > 0) {
        return;
      }

      setStatus("joining");
      if (!isAuthenticated) {
        setDisplayName(values.displayName.trim());
      }
      const roomCode = extractRoomCode(values);
      window.setTimeout(() => {
        navigate(buildWorkspacePath(roomCode));
      }, 500);
    },
    [values, isAuthenticated, navigate, setDisplayName],
  );

  return { values, errors, status, isAuthenticated, setField, joinWithCode, handleSubmit };
}
