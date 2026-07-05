export type StatusTone = "active" | "closed" | "neutral";

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
}

const DOT_CLASSES: Record<StatusTone, string> = {
  active: "bg-success-mint",
  closed: "bg-outline",
  neutral: "bg-outline-variant",
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface border border-outline-variant text-[12px] text-on-surface-variant">
      <span className={`w-1.5 h-1.5 rounded-full ${DOT_CLASSES[tone]}`} />
      {label}
    </span>
  );
}
