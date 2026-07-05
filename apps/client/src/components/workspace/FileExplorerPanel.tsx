import { Icon } from "../common";
import { FileTreeItem } from "./FileTreeItem";
import { MOCK_BRANCH_NAME, MOCK_PROJECT_NAME } from "../../constants/mockRepository";
import type { FileNode } from "../../types/workspace";

interface FileExplorerPanelProps {
  tree: FileNode[];
  activeFileId: string;
  onToggleFolder: (folderId: string) => void;
  onSelectFile: (node: FileNode) => void;
}

export function FileExplorerPanel({ tree, activeFileId, onToggleFolder, onSelectFile }: FileExplorerPanelProps) {
  return (
    <div className="w-64 flex-shrink-0 bg-surface-container-lowest border-r border-outline-variant hidden lg:flex flex-col h-full z-30">
      <div className="h-12 px-md flex items-center border-b border-outline-variant/50">
        <span className="font-label-sm text-label-sm text-on-surface-variant tracking-wider">EXPLORER</span>
      </div>

      <div className="px-md py-sm flex items-center gap-sm">
        <div className="w-6 h-6 rounded bg-primary-container/20 flex items-center justify-center text-primary border border-primary-container/30">
          <Icon name="view_in_ar" size={14} />
        </div>
        <div>
          <div className="font-body-sm text-body-sm font-medium text-on-surface leading-tight">{MOCK_PROJECT_NAME}</div>
          <div className="font-label-sm text-[10px] text-on-surface-variant leading-tight opacity-80 flex items-center gap-1">
            <Icon name="fork_right" size={10} />
            {MOCK_BRANCH_NAME} branch
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-sm px-xs">
        <ul className="font-code text-code text-on-surface-variant">
          {tree.map((node) => (
            <FileTreeItem
              key={node.id}
              node={node}
              depth={0}
              activeFileId={activeFileId}
              onToggleFolder={onToggleFolder}
              onSelectFile={onSelectFile}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
