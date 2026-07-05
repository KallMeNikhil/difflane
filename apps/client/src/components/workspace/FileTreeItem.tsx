import { Icon } from "../common";
import { getFileIcon } from "../../utils/workspaceDisplay";
import type { FileNode } from "../../types/workspace";

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  activeFileId: string;
  onToggleFolder: (folderId: string) => void;
  onSelectFile: (node: FileNode) => void;
}

export function FileTreeItem({ node, depth, activeFileId, onToggleFolder, onSelectFile }: FileTreeItemProps) {
  if (node.type === "folder") {
    return (
      <li>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onToggleFolder(node.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              onToggleFolder(node.id);
            }
          }}
          className="flex items-center gap-xs px-sm py-[4px] hover:bg-surface-container rounded cursor-pointer text-on-surface"
        >
          <Icon name={node.isExpanded ? "keyboard_arrow_down" : "keyboard_arrow_right"} size={16} />
          <Icon name="folder" size={16} className="text-primary" />
          <span>{node.name}</span>
        </div>
        {node.isExpanded && node.children && (
          <ul className="pl-md ml-xs border-l border-outline-variant/30">
            {node.children.map((child) => (
              <FileTreeItem
                key={child.id}
                node={child}
                depth={depth + 1}
                activeFileId={activeFileId}
                onToggleFolder={onToggleFolder}
                onSelectFile={onSelectFile}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const isActive = node.id === activeFileId;

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelectFile(node)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            onSelectFile(node);
          }
        }}
        className={`flex items-center gap-xs px-sm py-[4px] rounded cursor-pointer ${
          isActive
            ? "bg-primary-container/20 text-primary-fixed border border-primary-container/30"
            : "hover:bg-surface-container text-on-surface-variant"
        }`}
      >
        <span className="w-4" />
        <Icon name={getFileIcon(node.name)} size={16} className={isActive ? "text-primary-fixed" : "text-secondary"} />
        <span className={isActive ? "font-medium" : ""}>{node.name}</span>
      </div>
    </li>
  );
}
