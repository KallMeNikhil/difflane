import { useCallback, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { validateJoinRoomForm } from "../services/RoomService";
import { ROUTES } from "../constants/routes";
import { useCurrentUser } from "../contexts/CurrentUserContext";
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
  const { setDisplayName } = useCurrentUser();
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
      const trimmedDisplayName = values.displayName.trim();
      if (!trimmedDisplayName) {
        setErrors((prev) => ({ ...prev, displayName: "Display name is required." }));
        return;
      }

      setField("roomCode", code);
      setStatus("joining");
      setDisplayName(trimmedDisplayName);
      window.setTimeout(() => {
        navigate(ROUTES.workspace, { state: { roomCode: code } });
      }, 400);
    },
    [values.displayName, setField, navigate, setDisplayName],
  );

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      const validationErrors = validateJoinRoomForm(values);
      setErrors(validationErrors);
      if (Object.keys(validationErrors).length > 0) {
        return;
      }

      setStatus("joining");
      setDisplayName(values.displayName.trim());
      const roomCode = extractRoomCode(values);
      window.setTimeout(() => {
        navigate(ROUTES.workspace, { state: { roomCode } });
      }, 500);
    },
    [values, navigate, setDisplayName],
  );

  return { values, errors, status, setField, joinWithCode, handleSubmit };
}
