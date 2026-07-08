import { Avatar, type AvatarTone } from "../common/Avatar";
import { Icon } from "../common/Icon";

export interface ActiveRoomCollaborator {
  initials: string;
  tone: AvatarTone;
}

export interface ActiveRoom {
  id: string;
  repositoryLabel: string;
  title: string;
  collaborators: ActiveRoomCollaborator[];
  overflowLabel?: string;
  unresolvedCount: number;
}

interface ActiveRoomCardProps {
  room: ActiveRoom;
  onContinue?: (roomId: string) => void;
}

export function ActiveRoomCard({ room, onContinue }: ActiveRoomCardProps) {
  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-xl p-md flex flex-col gap-md hover:border-primary transition-colors cursor-pointer group">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-xs">
          <span className="inline-block px-2 py-0.5 bg-surface-container border border-outline-variant rounded-md font-code text-[12px] text-secondary w-fit">
            {room.repositoryLabel}
          </span>
          <h3 className="font-label-md text-label-md text-on-surface text-lg">{room.title}</h3>
        </div>
        <div className="w-2 h-2 rounded-full bg-success-mint animate-pulse mt-2" />
      </div>

      <div className="flex-grow flex flex-col justify-end gap-sm">
        <div className="flex justify-between items-center text-on-surface-variant font-body-sm text-body-sm">
          <div className="flex -space-x-2">
            {room.collaborators.map((collaborator, index) => (
              <Avatar key={index} initials={collaborator.initials} tone={collaborator.tone} size="sm" />
            ))}
            {room.overflowLabel && (
              <div className="w-6 h-6 rounded-full bg-tertiary-container border border-surface flex items-center justify-center text-[10px] text-on-tertiary-container font-bold">
                {room.overflowLabel}
              </div>
            )}
          </div>
          <div className="flex items-center gap-xs">
            <Icon name="forum" size={16} />
            <span>{room.unresolvedCount} unresolved</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onContinue?.(room.id)}
          className="w-full mt-2 py-1.5 bg-surface-variant text-on-surface border border-outline-variant rounded-lg font-label-md text-label-md group-hover:bg-primary-container group-hover:text-on-primary-container group-hover:border-primary-container transition-all"
        >
          Resume Workspace
        </button>
      </div>
    </div>
  );
}
