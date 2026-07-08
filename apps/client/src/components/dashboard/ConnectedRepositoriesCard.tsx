import { Card, CardHeader, Icon, IconButton } from "../common";

export interface ConnectedRepository {
  id: string;
  name: string;
  syncedLabel: string;
}

interface ConnectedRepositoriesCardProps {
  repositories: ConnectedRepository[];
  onAddRepository?: () => void;
  onOpenRoom?: (repositoryId: string) => void;
}

export function ConnectedRepositoriesCard({
  repositories,
  onAddRepository,
  onOpenRoom,
}: ConnectedRepositoriesCardProps) {
  return (
    <Card className="flex flex-col gap-md">
      <CardHeader
        title="Connected Repositories"
        action={
          <IconButton icon="add" aria-label="Add Repository" shape="square" size={18} className="w-8 h-8 border border-outline-variant" onClick={onAddRepository} />
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
        {repositories.map((repo) => (
          <div
            key={repo.id}
            className="p-sm bg-surface-container rounded-lg border border-outline-variant flex items-center justify-between"
          >
            <div className="flex items-center gap-sm overflow-hidden">
              <Icon name="source" className="text-secondary flex-shrink-0" />
              <div className="flex flex-col truncate">
                <span className="font-code text-[13px] text-on-surface truncate">{repo.name}</span>
                <span className="font-label-sm text-[10px] text-success-mint flex items-center gap-1">
                  <Icon name="sync" size={12} />
                  {repo.syncedLabel}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenRoom?.(repo.id)}
              className="ml-2 flex-shrink-0 px-2 py-1 bg-surface border border-outline-variant text-on-surface-variant rounded text-[11px] font-medium hover:text-on-surface hover:border-primary transition-colors"
            >
              Open Workspace
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
