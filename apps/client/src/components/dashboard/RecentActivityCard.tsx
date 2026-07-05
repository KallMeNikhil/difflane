import type { ReactNode } from "react";
import { Card } from "../common";

export interface ActivityItem {
  id: string;
  message: ReactNode;
  timeLabel: string;
  emphasized?: boolean;
}

interface RecentActivityCardProps {
  items: ActivityItem[];
}

export function RecentActivityCard({ items }: RecentActivityCardProps) {
  return (
    <Card className="flex-grow">
      <h2 className="font-label-md text-label-md text-on-surface text-lg font-semibold mb-md border-b border-outline-variant pb-sm">
        Recent Activity
      </h2>
      <div className="relative border-l border-outline-variant ml-3 space-y-6">
        {items.map((item) => (
          <div key={item.id} className="relative pl-6">
            <div
              className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-surface-container-low ${
                item.emphasized ? "bg-primary" : "bg-surface-variant"
              }`}
            />
            <p className="font-body-sm text-[13px] text-on-surface leading-tight">{item.message}</p>
            <span className="font-label-sm text-[11px] text-on-surface-variant mt-1 block">{item.timeLabel}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
