import { useNavigate } from "react-router-dom";
import {
  Button,
  Icon,
  ModalShell,
  RadioCardGroup,
  SelectField,
  SwitchToggle,
  TextAreaField,
  TextField,
} from "../components/common";
import { useCreateRoomForm } from "../hooks/useCreateRoomForm";
import {
  DESCRIPTION_MAX_LENGTH,
  ROOM_NAME_MAX_LENGTH,
} from "../services/RoomService";
import {
  MAX_PARTICIPANTS_OPTIONS,
  PROGRAMMING_LANGUAGE_OPTIONS,
  REVIEW_MODE_OPTIONS,
  VISIBILITY_OPTIONS,
} from "../constants/roomOptions";
import { ROUTES } from "../constants/routes";

export default function CreateRoom() {
  const navigate = useNavigate();
  const { values, errors, status, roomCode, setField, setFeature, handleSubmit, reset } =
    useCreateRoomForm();

  const handleClose = () => navigate(ROUTES.landing);

  if (status === "success" && roomCode) {
    return (
      <ModalShell
        title="Workspace Created"
        description="Your workspace is ready. Share the code below to invite collaborators."
        onClose={handleClose}
        maxWidthClassName="max-w-[560px]"
        footer={
          <div className="flex justify-end gap-md">
            <Button variant="secondary" onClick={reset}>
              Create Another
            </Button>
            <Button variant="primary" onClick={() => navigate(ROUTES.workspace, { state: { roomCode } })}>
              <Icon name="arrow_forward" size={18} />
              Enter Workspace
            </Button>
          </div>
        }
      >
        <div className="p-lg flex flex-col items-center text-center gap-md">
          <div className="w-14 h-14 rounded-xl bg-success-mint/10 border border-success-mint/30 flex items-center justify-center">
            <Icon name="check_circle" size={28} className="text-success-mint" filled />
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            <span className="text-on-surface font-medium">{values.roomName}</span> is ready to go.
          </p>
          <div className="w-full max-w-xs bg-surface border border-outline-variant rounded-lg px-md py-lg text-center font-code text-code text-on-surface tracking-[0.5em] uppercase">
            {roomCode}
          </div>
        </div>
      </ModalShell>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <ModalShell
        title="Create Workspace"
        description="Create a collaborative coding workspace for your team."
        onClose={handleClose}
        maxWidthClassName="max-w-[740px]"
        footer={
          <div className="flex justify-end gap-md">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={status === "submitting"}>
              <Icon name="add" size={18} />
              {status === "submitting" ? "Creating…" : "Create Workspace"}
            </Button>
          </div>
        }
      >
        <div className="p-lg space-y-lg">
          {}
          <section className="space-y-md">
            <h2 className="font-label-md text-label-md text-primary uppercase tracking-wider">
              Workspace Information
            </h2>
            <div className="space-y-md">
              <TextField
                label="Workspace Name"
                required
                placeholder="e.g., Q3 Core API Refactor"
                value={values.roomName}
                maxLength={ROOM_NAME_MAX_LENGTH}
                error={errors.roomName}
                onChange={(event) => setField("roomName", event.target.value)}
              />
              <TextAreaField
                label="Description"
                optional
                rows={3}
                placeholder="Briefly describe the purpose of this session..."
                value={values.description}
                maxLength={DESCRIPTION_MAX_LENGTH}
                error={errors.description}
                onChange={(event) => setField("description", event.target.value)}
              />
            </div>
          </section>

          <hr className="border-outline-variant/30" />

          {}
          <section className="space-y-md">
            <h2 className="font-label-md text-label-md text-primary uppercase tracking-wider">
              Workspace Settings
            </h2>
            <div className="space-y-lg">
              <RadioCardGroup
                name="review_mode"
                legend="Session Mode"
                options={REVIEW_MODE_OPTIONS}
                value={values.reviewMode}
                onChange={(value) => setField("reviewMode", value as typeof values.reviewMode)}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                <SelectField
                  label="Programming Language"
                  options={PROGRAMMING_LANGUAGE_OPTIONS}
                  value={values.programmingLanguage}
                  onChange={(event) =>
                    setField("programmingLanguage", event.target.value as typeof values.programmingLanguage)
                  }
                />
                <SelectField
                  label="Visibility"
                  options={VISIBILITY_OPTIONS}
                  value={values.visibility}
                  onChange={(event) => setField("visibility", event.target.value as typeof values.visibility)}
                />
                <SelectField
                  label="Max Participants"
                  options={MAX_PARTICIPANTS_OPTIONS}
                  value={values.maxParticipants}
                  onChange={(event) =>
                    setField("maxParticipants", event.target.value as typeof values.maxParticipants)
                  }
                />
              </div>
            </div>
          </section>

          <hr className="border-outline-variant/30" />

          {}
          <section className="space-y-md">
            <h2 className="font-label-md text-label-md text-primary uppercase tracking-wider">
              Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-md gap-y-lg">
              <SwitchToggle
                icon="robot_2"
                label="AI Review Assistant"
                description="Auto-summarize discussions and suggest context."
                checked={values.features.aiReviewAssistant}
                onChange={(checked) => setFeature("aiReviewAssistant", checked)}
              />
              <SwitchToggle
                icon="near_me"
                label="Cursor Presence"
                description="Show active user cursors in live mode."
                checked={values.features.cursorPresence}
                onChange={(checked) => setFeature("cursorPresence", checked)}
              />
              <SwitchToggle
                icon="chat_bubble"
                label="Inline Discussions"
                description="Allow threaded comments directly on content blocks."
                checked={values.features.inlineDiscussions}
                onChange={(checked) => setFeature("inlineDiscussions", checked)}
              />
              <SwitchToggle
                icon="explore"
                label="Shared Navigation"
                description="Sync scroll and navigation across all participants."
                checked={values.features.sharedNavigation}
                onChange={(checked) => setFeature("sharedNavigation", checked)}
              />
            </div>
          </section>
        </div>
      </ModalShell>
    </form>
  );
}
