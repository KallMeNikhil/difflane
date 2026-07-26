import { Avatar, type AvatarTone, type PresenceStatus, Card, ComingSoonBadge } from "../common";

export interface TeamPresenceMember {
  id: string;
  initials: string;
  name: string;
  statusLabel: string;
  tone: AvatarTone;
  presence: PresenceStatus;
}

interface TeamPresenceCardProps {
  members: TeamPresenceMember[];
  comingSoon?: boolean;
}

export function TeamPresenceCard({ members, comingSoon = false }: TeamPresenceCardProps) {
  return (
    <Card>
      <h2 className="font-label-md text-label-md text-on-surface text-lg font-semibold mb-sm border-b border-outline-variant pb-sm flex items-center gap-sm">
        Team Presence
        {comingSoon && <ComingSoonBadge />}
      </h2>
      <div className="flex flex-col gap-3">
        {comingSoon ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Cross-workspace team presence isn't available yet.
          </p>
        ) : members.length === 0 ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">No teammates online right now.</p>
        ) : null}
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-sm">
            <Avatar initials={member.initials} tone={member.tone} presence={member.presence} />
            <div className="flex flex-col">
              <span className="font-body-sm text-body-sm text-on-surface font-medium leading-none">
                {member.name}
              </span>
              <span className="font-label-sm text-[11px] text-on-surface-variant">{member.statusLabel}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
