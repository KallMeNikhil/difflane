import { useNavigate } from "react-router-dom";
import { Button, Icon, ModalShell, TextField } from "../components/common";
import { useJoinRoomForm } from "../hooks/useJoinRoomForm";
import { DISPLAY_NAME_MAX_LENGTH, generateMockRoomCode } from "../services/RoomService";
import { MOCK_RECENT_ROOMS } from "../constants/mockRecentRooms";
import { ROUTES } from "../constants/routes";

export default function JoinRoom() {
  const navigate = useNavigate();
  const { values, errors, status, setField, joinWithCode, handleSubmit } = useJoinRoomForm();

  const handleClose = () => navigate(ROUTES.landing);
  const isJoining = status === "joining";

  return (
    <form onSubmit={handleSubmit} noValidate>
      <ModalShell
        icon="meeting_room"
        title="Join Review Room"
        description="Enter a room code or invitation link to join an active collaborative review session."
        onClose={handleClose}
        maxWidthClassName="max-w-[680px]"
        footer={
          <div className="flex items-center justify-between gap-md flex-wrap">
            <div className="hidden sm:flex items-center gap-lg">
              <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                <span className="w-2 h-2 rounded-full bg-success-mint" />
                Online
              </span>
              <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                <Icon name="cloud_sync" size={14} />
                Connected Workspace
              </span>
              <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                <Icon name="check_circle" size={14} />
                Ready to Join
              </span>
            </div>
            <div className="flex items-center gap-md ml-auto">
              <Button type="button" variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isJoining}>
                {isJoining ? "Joining…" : "Join Room"}
                <Icon name="login" size={18} />
              </Button>
            </div>
          </div>
        }
      >
        <div className="p-lg flex flex-col gap-lg">
          <TextField
            label="Display Name"
            required
            placeholder="e.g., Alex Rivera"
            value={values.displayName}
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            error={errors.displayName}
            onChange={(event) => setField("displayName", event.target.value)}
          />

          <div className="space-y-md">
            <div>
              <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm">
                Room Code
              </span>
              <TextField
                id="room-code"
                label="Room Code"
                hideLabel
                variant="code"
                placeholder="AB7C2"
                value={values.roomCode}
                error={errors.roomCode}
                onChange={(event) => setField("roomCode", event.target.value)}
              />
            </div>

            <div className="flex items-center justify-center gap-4">
              <div className="h-px bg-outline-variant flex-1" />
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Or</span>
              <div className="h-px bg-outline-variant flex-1" />
            </div>

            <div>
              <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm">
                Invitation Link
              </span>
              <div className="relative">
                <Icon
                  name="link"
                  size={18}
                  className="absolute left-md top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none"
                />
                <TextField
                  id="invitation-link"
                  label="Invitation Link"
                  hideLabel
                  className="pl-[40px]"
                  placeholder="https://difflane.app/room/..."
                  value={values.invitationLink}
                  error={errors.invitationLink}
                  onChange={(event) => setField("invitationLink", event.target.value)}
                />
              </div>
            </div>

            {errors.form && (
              <p className="font-body-sm text-body-sm text-error" role="alert">
                {errors.form}
              </p>
            )}
          </div>

          <div>
            <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm">
              Recent Rooms
            </span>
            <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden divide-y divide-outline-variant/50">
              {MOCK_RECENT_ROOMS.map((room) => (
                <div
                  key={room.id}
                  className="group flex items-center justify-between p-md hover:bg-surface-variant/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon name="history" size={20} className="text-outline-variant group-hover:text-primary transition-colors" />
                    <div>
                      <h3 className="font-body-sm text-body-sm font-medium text-on-surface">{room.name}</h3>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        {room.joinedLabel} • Host: {room.hostName}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 font-label-sm text-label-sm text-primary px-sm py-xs rounded bg-primary/10 hover:bg-primary/20 transition-all flex items-center gap-1"
                    onClick={() => joinWithCode(generateMockRoomCode())}
                    disabled={isJoining}
                  >
                    Continue
                    <Icon name="arrow_forward" size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ModalShell>
    </form>
  );
}
