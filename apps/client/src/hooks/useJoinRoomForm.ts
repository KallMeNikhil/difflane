import { useCallback, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { validateJoinRoomForm } from "../services/RoomService";
import { ROUTES } from "../constants/routes";
import type { JoinRoomFormErrors, JoinRoomFormValues } from "../types/room";

const INITIAL_VALUES: JoinRoomFormValues = {
  displayName: "",
  roomCode: "",
  invitationLink: "",
};

export type JoinRoomStatus = "idle" | "joining";

export function useJoinRoomForm() {
  const navigate = useNavigate();
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
      window.setTimeout(() => {
        navigate(ROUTES.workspace);
      }, 400);
    },
    [values.displayName, setField, navigate],
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
      window.setTimeout(() => {
        navigate(ROUTES.workspace);
      }, 500);
    },
    [values, navigate],
  );

  return { values, errors, status, setField, joinWithCode, handleSubmit };
}
