import { useCallback, useState, type FormEvent } from "react";
import { createMockRoom, validateCreateRoomForm } from "../services/RoomService";
import type {
  CreateRoomFeatureToggles,
  CreateRoomFormErrors,
  CreateRoomFormValues,
} from "../types/room";

const INITIAL_FEATURES: CreateRoomFeatureToggles = {
  aiReviewAssistant: true,
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

export type CreateRoomStatus = "idle" | "submitting" | "success";

export function useCreateRoomForm() {
  const [values, setValues] = useState<CreateRoomFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<CreateRoomFormErrors>({});
  const [status, setStatus] = useState<CreateRoomStatus>("idle");
  const [roomCode, setRoomCode] = useState<string | null>(null);

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
      window.setTimeout(() => {
        const result = createMockRoom();
        setRoomCode(result.roomCode);
        setStatus("success");
      }, 500);
    },
    [values],
  );

  const reset = useCallback(() => {
    setValues(INITIAL_VALUES);
    setErrors({});
    setStatus("idle");
    setRoomCode(null);
  }, []);

  return { values, errors, status, roomCode, setField, setFeature, handleSubmit, reset };
}
