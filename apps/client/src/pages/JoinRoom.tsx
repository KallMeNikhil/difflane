import { useNavigate } from "react-router-dom";
import { Icon, ModalShell, TextField, getButtonClasses } from "../components/common";
import { useJoinRoomForm } from "../hooks/useJoinRoomForm";
import { DISPLAY_NAME_MAX_LENGTH } from "../services/RoomService";
import { useWorkspaceDashboard } from "../hooks/useWorkspaceDashboard";
import { formatRelativeTimeLabel } from "../services/SessionHistoryService";
import { ROUTES } from "../constants/routes";

const PRIMARY_BUTTON = getButtonClasses("primary", "md");
const SECONDARY_BUTTON = getButtonClasses("secondary", "md");

export default function JoinRoom() {
  const navigate = useNavigate();
  const { values, errors, status, isAuthenticated, setField, joinWithCode, handleSubmit } = useJoinRoomForm();
  const { dashboard } = useWorkspaceDashboard();

  const handleClose = () => navigate(ROUTES.landing);
  const isJoining = status === "joining";
  const recentRooms = dashboard.recent.map((workspace) => ({
    id: workspace.workspaceCode,
    name: workspace.name,
    joinedLabel: formatRelativeTimeLabel(workspace.createdAt),
  }));

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
          {!isAuthenticated && (
            <TextField
              label="Display Name"
              required
              placeholder="e.g., Your Name"
              value={values.displayName}
              maxLength={DISPLAY_NAME_MAX_LENGTH}
              error={errors.displayName}
              onChange={(event) => setField("displayName", event.target.value)}
            />
          )}

          <div className="space-y-md">
            <div>
              <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm">
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
                  className="absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
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
              Recent Workspaces
            </span>
            {recentRooms.length > 0 ? (
              <div className="bg-surface-container-high border border-outline-variant rounded-lg overflow-hidden divide-y divide-outline-variant">
                {recentRooms.map((room) => (
                  <div
                    key={room.id}
                    className="group flex items-center justify-between p-md hover:bg-surface-container-high transition-colors duration-300 ease-out"
                  >
                    <div className="flex items-center gap-3">
                      <Icon name="history" size={20} className="text-on-surface-variant group-hover:text-primary transition-colors duration-300 ease-out" />
                      <div>
                        <h3 className="font-body-sm text-body-sm font-medium text-on-surface">{room.name}</h3>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">{room.joinedLabel}</p>
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
            ) : (
              <p className="font-body-sm text-body-sm text-on-surface-variant">No recent workspaces yet.</p>
            )}
          </div>
        </div>
      </ModalShell>
    </form>
  );
}
