import type { ReactNode } from "react";
import { Icon } from "./Icon";

interface PlaceholderNoticeProps {
  title: string;
  description: string;
  icon?: string;
  action?: ReactNode;
}

export function PlaceholderNotice({ title, description, icon = "construction", action }: PlaceholderNoticeProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-lg py-3xl gap-md">
      <div className="w-16 h-16 rounded-xl bg-surface-container-highest border border-outline-variant flex items-center justify-center">
        <Icon name={icon} size={28} className="text-primary/80" />
      </div>
      <div className="flex flex-col gap-xs max-w-md">
        <h1 className="font-headline-md text-headline-md text-on-surface">{title}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">{description}</p>
      </div>
      {action}
    </div>
  );
}
