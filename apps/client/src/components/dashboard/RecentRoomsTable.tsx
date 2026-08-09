import { Card, StatusBadge, type StatusTone } from "../common";

export interface RecentRoom {
  id: string;
  name: string;
  repository: string;
  lastOpened: string;
  status: { label: string; tone: StatusTone };
}

interface RecentRoomsTableProps {
  rooms: RecentRoom[];
  onViewAll?: () => void;
  onSelectRoom?: (roomId: string) => void;
}

export function RecentRoomsTable({ rooms, onViewAll, onSelectRoom }: RecentRoomsTableProps) {
  return (
    <Card noPadding className="overflow-hidden flex flex-col">
      <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
        <h2 className="font-label-md text-label-md text-on-surface text-lg font-semibold">Recent Workspaces</h2>
        <button type="button" onClick={onViewAll} className="text-primary font-label-md text-label-sm hover:underline">
          View All
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-lowest font-label-sm text-label-sm text-on-surface-variant border-b border-outline-variant">
              <th className="px-md py-sm font-medium">Workspace Name</th>
              <th className="px-md py-sm font-medium">Repository</th>
              <th className="px-md py-sm font-medium">Last Opened</th>
              <th className="px-md py-sm font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="font-body-sm text-body-sm text-on-surface divide-y divide-outline-variant">
            {rooms.map((room) => (
              <tr
                key={room.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectRoom?.(room.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectRoom?.(room.id);
                  }
                }}
                className="hover:bg-surface-container transition-colors cursor-pointer group"
              >
                <td className="px-md py-3 font-medium group-hover:text-primary transition-colors">{room.name}</td>
                <td className="px-md py-3">
                  <span className="font-code text-[12px] text-secondary">{room.repository}</span>
                </td>
                <td className="px-md py-3 text-on-surface-variant">{room.lastOpened}</td>
                <td className="px-md py-3">
                  <StatusBadge label={room.status.label} tone={room.status.tone} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
