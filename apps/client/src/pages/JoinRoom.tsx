import { useNavigate } from "react-router-dom";
import { Icon, ModalShell, TextField } from "../components/common";
import { useJoinRoomForm } from "../hooks/useJoinRoomForm";
import { DISPLAY_NAME_MAX_LENGTH } from "../services/RoomService";
import { MOCK_RECENT_ROOMS } from "../constants/mockRecentRooms";
import { ROUTES } from "../constants/routes";

const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-sm font-label-md text-label-md px-lg py-sm rounded-lg bg-primary-container text-white hover:brightness-110 shadow-md shadow-primary-container/20 hover:-translate-y-0.5 transition-all duration-300 ease-out disabled:opacity-50 disabled:pointer-events-none disabled:hover:translate-y-0";
const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-sm font-label-md text-label-md px-lg py-sm rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white transition-all duration-300 ease-out";

export default function JoinRoom() {
  const navigate = useNavigate();
  const { values, errors, status, setField, joinWithCode, handleSubmit } = useJoinRoomForm();

  const handleClose = () => navigate(ROUTES.landing);
  const isJoining = status === "joining";

  return (
    <form onSubmit={handleSubmit} noValidate>
      <ModalShell
        icon="meeting_room"
        title="Join Workspace"
        description="Enter a workspace code or invitation link to join an active collaborative session."
        onClose={handleClose}
        maxWidthClassName="max-w-[680px]"
        footer={
          <div className="flex items-center justify-between gap-md flex-wrap">
            <div className="hidden sm:flex items-center gap-lg">
              <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-gray-400">
                <span className="w-2 h-2 rounded-full bg-success-mint" />
                Online
              </span>
              <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-gray-400">
                <Icon name="cloud_sync" size={14} />
                Connected Workspace
              </span>
              <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-gray-400">
                <Icon name="check_circle" size={14} />
                Ready to Join
              </span>
            </div>
            <div className="flex items-center gap-md ml-auto">
              <button type="button" className={SECONDARY_BUTTON} onClick={handleClose}>
                Cancel
              </button>
              <button type="submit" className={PRIMARY_BUTTON} disabled={isJoining}>
                {isJoining ? "Joining…" : "Join Workspace"}
                <Icon name="login" size={18} />
              </button>
            </div>
          </div>
        }
      >
        <div className="p-lg flex flex-col gap-lg">
          <TextField
            label="Display Name"
            required
            placeholder="e.g., Your Name"
            value={values.displayName}
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            error={errors.displayName}
            onChange={(event) => setField("displayName", event.target.value)}
          />

          <div className="space-y-md">
            <div>
              <span className="block font-label-sm text-label-sm text-gray-400 uppercase tracking-wider mb-sm">
                Workspace Code
              </span>
              <TextField
                id="room-code"
                label="Workspace Code"
                hideLabel
                variant="code"
                placeholder="AB7C2"
                value={values.roomCode}
                error={errors.roomCode}
                onChange={(event) => setField("roomCode", event.target.value)}
              />
            </div>

            <div className="flex items-center justify-center gap-4">
              <div className="h-px bg-white/10 flex-1" />
              <span className="font-label-sm text-label-sm text-gray-400 uppercase">Or</span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            <div>
              <span className="block font-label-sm text-label-sm text-gray-400 uppercase tracking-wider mb-sm">
                Invitation Link
              </span>
              <div className="relative">
                <Icon
                  name="link"
                  size={18}
                  className="absolute left-md top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
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
            <span className="block font-label-sm text-label-sm text-gray-400 uppercase tracking-wider mb-sm">
              Recent Workspaces
            </span>
            <div className="bg-[#161b22] border border-white/10 rounded-lg overflow-hidden divide-y divide-white/5">
              {MOCK_RECENT_ROOMS.map((room) => (
                <div
                  key={room.id}
                  className="group flex items-center justify-between p-md hover:bg-white/5 transition-colors duration-300 ease-out"
                >
                  <div className="flex items-center gap-3">
                    <Icon name="history" size={20} className="text-gray-500 group-hover:text-primary transition-colors duration-300 ease-out" />
                    <div>
                      <h3 className="font-body-sm text-body-sm font-medium text-gray-100">{room.name}</h3>
                      <p className="font-label-sm text-label-sm text-gray-400">
                        {room.joinedLabel} • Host: {room.hostName}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 font-label-sm text-label-sm text-primary px-sm py-xs rounded bg-primary/10 hover:bg-primary/20 transition-all duration-300 ease-out flex items-center gap-1"
                    onClick={() => joinWithCode(room.id)}
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
