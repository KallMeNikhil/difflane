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

interface CardHeaderProps {
  title: string;
  action?: ReactNode;
}

export function CardHeader({ title, action }: CardHeaderProps) {
  return (
    <div className="flex justify-between items-center border-b border-outline-variant pb-sm mb-md">
      <h2 className="font-label-md text-label-md text-on-surface text-lg font-semibold">{title}</h2>
      {action}
    </div>
  );
}
