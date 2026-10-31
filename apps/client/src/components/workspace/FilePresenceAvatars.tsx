export interface FilePresenceEntry {
  id: string;
  name: string;
  initials: string;
  color: string;
  isEditing: boolean;
}

interface FilePresenceAvatarsProps {
  entries: FilePresenceEntry[];
  max?: number;
}

export function FilePresenceAvatars({ entries, max = 3 }: FilePresenceAvatarsProps) {
  if (entries.length === 0) {
    return null;
  }
  const visible = entries.slice(0, max);
  const overflow = entries.length - visible.length;
  const description = entries.map((entry) => `${entry.name} ${entry.isEditing ? "is editing" : "is viewing"}`).join("\n");
  return (
    <span className="flex items-center -space-x-1 shrink-0" title={description} aria-label={description}>
      {visible.map((entry) => (
        <span
          key={entry.id}
          className={`relative w-4 h-4 rounded-full border border-surface-container-lowest text-[7px] font-bold leading-none text-[#0b0d12] flex items-center justify-center ${
            entry.isEditing ? "ring-1 ring-offset-0 animate-pulse" : ""
          }`}
          style={{ backgroundColor: entry.color, ...(entry.isEditing ? { boxShadow: `0 0 0 1.5px ${entry.color}66` } : {}) }}
        >
          {entry.initials.slice(0, 2)}
        </span>
      ))}
      {overflow > 0 && (
        <span className="w-4 h-4 rounded-full border border-surface-container-lowest bg-surface-container-high text-[7px] font-bold text-on-surface flex items-center justify-center">
          +{overflow}
        </span>
      )}
    </span>
  );
}
