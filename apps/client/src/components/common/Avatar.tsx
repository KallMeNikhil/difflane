export type AvatarTone = "neutral" | "secondary" | "primary" | "tertiary";
export type PresenceStatus = "online" | "idle" | "offline";

interface AvatarProps {
  initials: string;
  tone?: AvatarTone;
  size?: "sm" | "md";
  presence?: PresenceStatus;
  className?: string;
}

const TONE_CLASSES: Record<AvatarTone, string> = {
  neutral: "bg-surface-variant text-on-surface",
  secondary: "bg-secondary-container text-on-secondary-container",
  primary: "bg-primary text-on-primary",
  tertiary: "bg-tertiary-container text-on-tertiary-container",
};

const PRESENCE_CLASSES: Record<PresenceStatus, string> = {
  online: "bg-success-mint",
  idle: "bg-tertiary",
  offline: "bg-outline",
};

const SIZE_CLASSES = {
  sm: "w-6 h-6 text-[10px]",
  md: "w-8 h-8 text-[12px]",
};

export function Avatar({ initials, tone = "neutral", size = "md", presence, className = "" }: AvatarProps) {
  return (
    <div className={`relative flex-shrink-0 ${className}`.trim()}>
      <div
        className={`rounded-full border border-surface flex items-center justify-center font-bold ${TONE_CLASSES[tone]} ${SIZE_CLASSES[size]}`}
      >
        {initials}
      </div>
      {presence && (
        <div
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-surface rounded-full ${PRESENCE_CLASSES[presence]}`}
        />
      )}
    </div>
  );
}
