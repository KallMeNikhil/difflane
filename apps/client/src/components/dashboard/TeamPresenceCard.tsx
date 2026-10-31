import { Avatar, type AvatarTone, type PresenceStatus, Card } from "../common";

export interface TeamPresenceMember {
  id: string;
  initials: string;
  name: string;
  statusLabel: string;
  tone: AvatarTone;
  presence: PresenceStatus;
  onOpen?: () => void;
}

interface TeamPresenceCardProps {
  members: TeamPresenceMember[];
  isLoading?: boolean;
}

export function TeamPresenceCard({ members, isLoading = false }: TeamPresenceCardProps) {
  return (
    <Card>
      <h2 className="font-label-md text-label-md text-on-surface text-lg font-semibold mb-sm border-b border-outline-variant pb-sm">Collaborators</h2>
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">Loading collaborators…</p>
        ) : members.length === 0 ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">People you code with will show up here.</p>
        ) : null}
        {members.map((member) => (
          <button
            key={member.id}
            type="button"
            onClick={member.onOpen}
            disabled={!member.onOpen}
            className="flex items-center gap-sm text-left rounded-lg -mx-xs px-xs py-0.5 hover:bg-surface-container disabled:hover:bg-transparent transition-colors"
          >
            <Avatar initials={member.initials} tone={member.tone} presence={member.presence} />
            <div className="flex flex-col min-w-0">
              <span className="font-body-sm text-body-sm text-on-surface font-medium leading-none truncate">{member.name}</span>
              <span className="font-label-sm text-[11px] text-on-surface-variant truncate">{member.statusLabel}</span>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
