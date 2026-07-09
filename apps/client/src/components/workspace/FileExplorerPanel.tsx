import { useState } from "react";
import { Icon } from "../common";
import { FileTreeItem } from "./FileTreeItem";
import { PendingCreateRow, type PendingCreate } from "./PendingCreateRow";
import { getImportSourceLabel, getRelativeTimeLabel } from "../../utils/workspaceDisplay";
import type { FileNode, WorkspaceRepositoryInfo } from "../../types/workspace";

export type { PendingCreate };

const TOOLBAR_BUTTON_CLASS =
  "w-7 h-7 flex items-center justify-center rounded text-[#A7AFBF] hover:bg-[#202632] hover:text-[#F3F4F6] transition-colors disabled:opacity-40 disabled:pointer-events-none";

function findNodeInTree(nodes: FileNode[], id: string): FileNode | undefined {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    if (node.children) {
      const found = findNodeInTree(node.children, id);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

interface FileExplorerPanelProps {
  tree: FileNode[];
  activeFileId: string;
  selectedId: string | null;
  resolveCreateParentId: () => string | null;
  repositoryInfo: WorkspaceRepositoryInfo | null;
  notice: { message: string; tone: "success" | "error" } | null;
  onDismissNotice: () => void;
  onToggleFolder: (folderId: string) => void;
  onSelectFile: (node: FileNode) => void;
  onCreateFile: (parentId: string | null, name: string) => void;
  onCreateFolder: (parentId: string | null, name: string) => void;
  onRenameEntry: (id: string, name: string) => void;
  onDeleteEntry: (id: string) => void;
  onDuplicateEntry: (id: string) => void;
  onCollapseAll: () => void;
  onOpenImport: () => void;
  onSync: () => void;
  isSyncing: boolean;
}

export function FileExplorerPanel({
  tree,
  activeFileId,
  selectedId,
  resolveCreateParentId,
  repositoryInfo,
  notice,
  onDismissNotice,
  onToggleFolder,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onRenameEntry,
  onDeleteEntry,
  onDuplicateEntry,
  onCollapseAll,
  onOpenImport,
  onSync,
  isSyncing,
}: FileExplorerPanelProps) {
  const [pendingCreate, setPendingCreate] = useState<PendingCreate | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  function commitPendingCreate(name: string) {
    const trimmed = name.trim();
    if (trimmed && pendingCreate) {
      if (pendingCreate.type === "file") {
        onCreateFile(pendingCreate.parentId, trimmed);
      } else {
        onCreateFolder(pendingCreate.parentId, trimmed);
      }
    }
    setPendingCreate(null);
  }

  function requestCreateAtSelection(type: "file" | "folder") {
    const parentId = resolveCreateParentId();
    if (parentId) {
      const target = findNodeInTree(tree, parentId);
      if (target && !target.isExpanded) {
        onToggleFolder(parentId);
      }
    }
    setPendingCreate({ parentId, type });
  }

  return (
    <div className="w-64 flex-shrink-0 bg-surface-container-lowest border-r border-outline-variant hidden lg:flex flex-col h-full z-30">
      <div className="h-12 px-md flex items-center border-b border-outline-variant/50">
        <div className="flex flex-col">
          <span className="font-label-sm text-label-sm text-on-surface-variant tracking-wider">EXPLORER</span>
        </div>
        <div className="ml-auto flex items-center gap-[6px]">
          <button
            type="button"
            title="New File"
            aria-label="New File"
            className={TOOLBAR_BUTTON_CLASS}
            onClick={() => requestCreateAtSelection("file")}
          >
            <Icon name="note_add" size={16} />
          </button>
          <button
            type="button"
            title="New Folder"
            aria-label="New Folder"
            className={TOOLBAR_BUTTON_CLASS}
            onClick={() => requestCreateAtSelection("folder")}
          >
            <Icon name="create_new_folder" size={16} />
          </button>
          <button
            type="button"
            title="Sync repository"
            aria-label="Sync repository"
            className={`${TOOLBAR_BUTTON_CLASS} ${isSyncing ? "animate-spin" : ""}`}
            onClick={onSync}
            disabled={repositoryInfo?.provider !== "github" || isSyncing}
          >
            <Icon name="refresh" size={16} />
          </button>
          <button type="button" title="Collapse All" aria-label="Collapse All" className={TOOLBAR_BUTTON_CLASS} onClick={onCollapseAll}>
            <Icon name="unfold_less" size={16} />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenImport}
        className="px-md py-sm flex items-center gap-sm border-b border-outline-variant/30 text-left hover:bg-[#171A20] transition-colors"
      >
        <div className="w-6 h-6 rounded bg-[#4F6EF7]/20 flex items-center justify-center text-[#4F6EF7] border border-[#4F6EF7]/30 shrink-0">
          <Icon name="view_in_ar" size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-body-sm text-body-sm font-medium text-[#F3F4F6] leading-tight truncate">
            {repositoryInfo ? repositoryInfo.name : "Untitled Workspace"}
          </div>
          {repositoryInfo ? (
            <>
              <div className="text-[10px] text-[#A7AFBF]/80 leading-tight">{getImportSourceLabel(repositoryInfo.provider)}</div>
              <div className="text-[9px] text-[#A7AFBF]/60 mt-0.5">
                {repositoryInfo.fileCount} Files • Last synced {getRelativeTimeLabel(repositoryInfo.lastSyncedAt)}
              </div>
            </>
          ) : (
            <div className="text-[10px] text-[#A7AFBF]/80 leading-tight">Import a project to get started</div>
          )}
        </div>
        <Icon name="expand_more" size={14} className="text-[#A7AFBF] shrink-0" />
      </button>

      <div className="flex-1 overflow-y-auto py-sm px-xs">
        {notice && (
          <div
            className={`mx-xs mb-2 px-sm py-1.5 border rounded flex items-center justify-between group ${
              notice.tone === "success" ? "bg-[#1A1F27] border-[#2A3140]" : "bg-error/10 border-error/30"
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon
                name={notice.tone === "success" ? "check_circle" : "error"}
                size={14}
                filled={notice.tone === "success"}
                className={notice.tone === "success" ? "text-[#22C55E]" : "text-error"}
              />
              <span className={`text-[11px] ${notice.tone === "success" ? "text-[#A7AFBF]" : "text-error"}`}>{notice.message}</span>
            </div>
            <button
              type="button"
              onClick={onDismissNotice}
              className="text-[#A7AFBF]/60 hover:text-[#F3F4F6] transition-colors"
              aria-label="Dismiss"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        )}

        <ul className="font-code text-code text-on-surface-variant">
          {pendingCreate?.parentId === null && (
            <PendingCreateRow type={pendingCreate.type} onCommit={commitPendingCreate} onCancel={() => setPendingCreate(null)} />
          )}
          {tree.map((node) => (
            <FileTreeItem
              key={node.id}
              node={node}
              depth={0}
              activeFileId={activeFileId}
              selectedId={selectedId}
              renamingId={renamingId}
              pendingCreate={pendingCreate}
              onToggleFolder={onToggleFolder}
              onSelectFile={onSelectFile}
              onStartRename={setRenamingId}
              onCommitRename={(id, name) => {
                onRenameEntry(id, name);
                setRenamingId(null);
              }}
              onCancelRename={() => setRenamingId(null)}
              onDelete={onDeleteEntry}
              onDuplicate={onDuplicateEntry}
              onRequestCreate={(parentId, type) => setPendingCreate({ parentId, type })}
              onCommitPendingCreate={commitPendingCreate}
              onCancelPendingCreate={() => setPendingCreate(null)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
