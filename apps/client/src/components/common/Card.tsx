import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  noPadding?: boolean;
}

export function Card({ children, noPadding = false, className = "", ...rest }: CardProps) {
  return (
    <div
      className={`bg-surface-container-low border border-outline-variant rounded-xl ${noPadding ? "" : "p-md"} ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
}

export function ComingSoonBadge() {
  return (
    <span className="px-2 py-0.5 rounded-full bg-tertiary-container/20 text-tertiary font-label-sm text-[9px] tracking-widest uppercase">
      Coming Soon
    </span>
  );
}

interface CardHeaderProps {
  title: string;
  titleAdornment?: ReactNode;
  action?: ReactNode;
}

export function CardHeader({ title, titleAdornment, action }: CardHeaderProps) {
  return (
    <div className="flex justify-between items-center border-b border-outline-variant pb-sm mb-md">
      <div className="flex items-center gap-sm">
        <h2 className="font-label-md text-label-md text-on-surface text-lg font-semibold">{title}</h2>
        {titleAdornment}
      </div>
      {action}
    </div>
  );
}
