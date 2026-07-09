import { Icon } from "../common";

interface WorkspaceEmptyStateProps {
  onOpenImport: () => void;
  onCreateFile: () => void;
  onCreateFolder: () => void;
}

const ACTIONS: {
  key: string;
  label: string;
  description: string;
  icon: string;
  onSelect: (props: WorkspaceEmptyStateProps) => void;
}[] = [
  {
    key: "github",
    label: "Import a GitHub Repository",
    description: "Pull in an existing repository to start reviewing.",
    icon: "hub",
    onSelect: (props) => props.onOpenImport(),
  },
  {
    key: "local",
    label: "Import a Local Folder",
    description: "Bring files straight from your machine.",
    icon: "folder",
    onSelect: (props) => props.onOpenImport(),
  },
  {
    key: "zip",
    label: "Import a ZIP Archive",
    description: "Upload a compressed project to unpack here.",
    icon: "archive",
    onSelect: (props) => props.onOpenImport(),
  },
  {
    key: "file",
    label: "Create a New File",
    description: "Start from a blank file in the workspace root.",
    icon: "note_add",
    onSelect: (props) => props.onCreateFile(),
  },
  {
    key: "folder",
    label: "Create a New Folder",
    description: "Organize your workspace with a new folder.",
    icon: "create_new_folder",
    onSelect: (props) => props.onCreateFolder(),
  },
];

export function WorkspaceEmptyState(props: WorkspaceEmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center overflow-y-auto p-lg">
      <div className="max-w-lg w-full flex flex-col items-center text-center gap-md">
        <div className="w-12 h-12 rounded-lg bg-[#4F6EF7]/15 border border-[#4F6EF7]/30 flex items-center justify-center">
          <Icon name="folder_open" size={24} className="text-[#4F6EF7]" />
        </div>
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">This workspace is empty</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
            Import an existing project or create your first file to get started.
          </p>
        </div>
        <div className="w-full flex flex-col gap-sm mt-sm">
          {ACTIONS.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => action.onSelect(props)}
              className="w-full flex items-center gap-sm px-md py-sm rounded-lg border border-outline-variant bg-surface-container-low hover:bg-surface-container hover:border-[#4F6EF7]/40 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded flex items-center justify-center bg-[#1A1F27] text-[#A7AFBF] shrink-0">
                <Icon name={action.icon} size={18} />
              </div>
              <div className="min-w-0">
                <div className="font-body-sm text-body-sm font-medium text-on-surface">{action.label}</div>
                <div className="text-[11px] text-on-surface-variant truncate">{action.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
