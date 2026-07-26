import { useCallback, useState, type FormEvent } from "react";
import { createWorkspaceRecord } from "../services/AuthService";
import { validateCreateRoomForm } from "../services/RoomService";
import { useCurrentUser } from "./useCurrentUser";
import type {
  CreateRoomFeatureToggles,
  CreateRoomFormErrors,
  CreateRoomFormValues,
} from "../types/room";

const INITIAL_FEATURES: CreateRoomFeatureToggles = {
  cursorPresence: true,
  inlineDiscussions: true,
  sharedNavigation: false,
};

const INITIAL_VALUES: CreateRoomFormValues = {
  roomName: "",
  description: "",
  programmingLanguage: "typescript",
  reviewMode: "live",
  visibility: "team",
  maxParticipants: "25",
  features: INITIAL_FEATURES,
};

export type CreateRoomStatus = "idle" | "submitting" | "success" | "error";

export function useCreateRoomForm() {
  const { isAuthenticated, guestId } = useCurrentUser();
  const [values, setValues] = useState<CreateRoomFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<CreateRoomFormErrors>({});
  const [status, setStatus] = useState<CreateRoomStatus>("idle");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setField = useCallback(
    <K extends keyof CreateRoomFormValues>(key: K, value: CreateRoomFormValues[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    [],
  );

  const setFeature = useCallback((key: keyof CreateRoomFeatureToggles, value: boolean) => {
    setValues((prev) => ({ ...prev, features: { ...prev.features, [key]: value } }));
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      const validationErrors = validateCreateRoomForm(values);
      setErrors(validationErrors);
      if (Object.keys(validationErrors).length > 0) {
        return;
      }

      setStatus("submitting");
      setSubmitError(null);
      createWorkspaceRecord(values.roomName, isAuthenticated ? null : guestId)
        .then((result) => {
          setRoomCode(result.workspaceCode);
          setStatus("success");
        })
        .catch(() => {
          setSubmitError("Unable to create your workspace right now. Please try again.");
          setStatus("error");
        });
    },
    [values, isAuthenticated, guestId],
  );

  const reset = useCallback(() => {
    setValues(INITIAL_VALUES);
    setErrors({});
    setStatus("idle");
    setRoomCode(null);
    setSubmitError(null);
  }, []);

  return { values, errors, status, roomCode, submitError, setField, setFeature, handleSubmit, reset };
}
