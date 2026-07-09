import { useEffect, useRef, useState } from "react";
import { Icon } from "../common";
import { PendingCreateRow, type PendingCreate } from "./PendingCreateRow";
import { getFileIcon } from "../../utils/workspaceDisplay";
import type { FileNode } from "../../types/workspace";

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  activeFileId: string;
  selectedId: string | null;
  renamingId: string | null;
  pendingCreate: PendingCreate | null;
  onToggleFolder: (folderId: string) => void;
  onSelectFile: (node: FileNode) => void;
  onStartRename: (id: string) => void;
  onCommitRename: (id: string, name: string) => void;
  onCancelRename: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRequestCreate: (parentId: string, type: "file" | "folder") => void;
  onCommitPendingCreate: (name: string) => void;
  onCancelPendingCreate: () => void;
}

const MENU_TRIGGER_CLASS = "opacity-0 group-hover:opacity-100 text-[#A7AFBF] hover:text-[#F3F4F6] transition-opacity";
const MENU_PANEL_CLASS =
  "absolute right-0 top-full mt-1 bg-[#171A20] border border-[#2A3140] rounded-lg shadow-xl z-50 py-1 font-body-sm text-[12px]";
const MENU_ITEM_CLASS = "w-full text-left px-3 py-1.5 hover:bg-[#202632] hover:text-[#F3F4F6] cursor-pointer";
const MENU_ITEM_DANGER_CLASS = "w-full text-left px-3 py-1.5 hover:bg-error/10 hover:text-error cursor-pointer";

function useCloseOnOutsideClick(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) {
      return;
    }
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);
  return ref;
}

export function FileTreeItem({
  node,
  depth,
  activeFileId,
  selectedId,
  renamingId,
  pendingCreate,
  onToggleFolder,
  onSelectFile,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onDelete,
  onDuplicate,
  onRequestCreate,
  onCommitPendingCreate,
  onCancelPendingCreate,
}: FileTreeItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useCloseOnOutsideClick(menuOpen, () => setMenuOpen(false));
  const isRenaming = renamingId === node.id;
  const isSelectedFolder = node.type === "folder" && selectedId === node.id;

  function handleEnsureExpanded() {
    if (!node.isExpanded) {
      onToggleFolder(node.id);
    }
  }

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
          className={`flex items-center gap-xs px-sm py-[4px] hover:bg-surface-container rounded cursor-pointer text-on-surface group relative ${
            isSelectedFolder ? "bg-[#1A1F27]" : ""
          }`}
        >
          {isRenaming ? (
            <RenameInput
              initialName={node.name}
              onCommit={(name) => onCommitRename(node.id, name)}
              onCancel={onCancelRename}
              leadingIcon="folder"
            />
          ) : (
            <>
              <Icon name={node.isExpanded ? "keyboard_arrow_down" : "keyboard_arrow_right"} size={16} />
              <Icon name="folder" size={16} className="text-primary" />
              <span className="flex-1 truncate">{node.name}</span>
              <button
                type="button"
                aria-label="Folder actions"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen((open) => !open);
                }}
                className={MENU_TRIGGER_CLASS}
              >
                <Icon name="more_vert" size={16} />
              </button>
              {menuOpen && (
                <div ref={menuRef} className={`${MENU_PANEL_CLASS} w-36`}>
                  <button
                    type="button"
                    className={MENU_ITEM_CLASS}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuOpen(false);
                      handleEnsureExpanded();
                      onRequestCreate(node.id, "file");
                    }}
                  >
                    New File
                  </button>
                  <button
                    type="button"
                    className={MENU_ITEM_CLASS}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuOpen(false);
                      handleEnsureExpanded();
                      onRequestCreate(node.id, "folder");
                    }}
                  >
                    New Folder
                  </button>
                  <button
                    type="button"
                    className={MENU_ITEM_CLASS}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuOpen(false);
                      onStartRename(node.id);
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className={MENU_ITEM_DANGER_CLASS}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuOpen(false);
                      onDelete(node.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        {node.isExpanded && (
          <ul className="pl-md ml-xs border-l border-outline-variant/30">
            {node.children?.map((child) => (
              <FileTreeItem
                key={child.id}
                node={child}
                depth={depth + 1}
                activeFileId={activeFileId}
                selectedId={selectedId}
                renamingId={renamingId}
                pendingCreate={pendingCreate}
                onToggleFolder={onToggleFolder}
                onSelectFile={onSelectFile}
                onStartRename={onStartRename}
                onCommitRename={onCommitRename}
                onCancelRename={onCancelRename}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onRequestCreate={onRequestCreate}
                onCommitPendingCreate={onCommitPendingCreate}
                onCancelPendingCreate={onCancelPendingCreate}
              />
            ))}
            {pendingCreate?.parentId === node.id && (
              <PendingCreateRow type={pendingCreate.type} onCommit={onCommitPendingCreate} onCancel={onCancelPendingCreate} />
            )}
            {node.children?.length === 0 && !pendingCreate && (
              <li className="px-sm py-1 text-[10px] text-[#7B8496] italic">(No files)</li>
            )}
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
        onClick={() => !isRenaming && onSelectFile(node)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            onSelectFile(node);
          }
        }}
        className={`flex items-center gap-xs px-sm py-[4px] rounded cursor-pointer group relative ${
          isActive
            ? "bg-primary-container/20 text-primary-fixed border border-primary-container/30"
            : "hover:bg-surface-container text-on-surface-variant"
        }`}
      >
        {isRenaming ? (
          <RenameInput
            initialName={node.name}
            onCommit={(name) => onCommitRename(node.id, name)}
            onCancel={onCancelRename}
            leadingIcon={getFileIcon(node.name)}
          />
        ) : (
          <>
            <span className="w-4" />
            <Icon name={getFileIcon(node.name)} size={16} className={isActive ? "text-primary-fixed" : "text-secondary"} />
            <span className={`flex-1 truncate ${isActive ? "font-medium" : ""}`}>{node.name}</span>
            <button
              type="button"
              aria-label="File actions"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((open) => !open);
              }}
              className={MENU_TRIGGER_CLASS}
            >
              <Icon name="more_vert" size={16} />
            </button>
            {menuOpen && (
              <div ref={menuRef} className={`${MENU_PANEL_CLASS} w-32`}>
                <button
                  type="button"
                  className={MENU_ITEM_CLASS}
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen(false);
                    onSelectFile(node);
                  }}
                >
                  Open
                </button>
                <button
                  type="button"
                  className={MENU_ITEM_CLASS}
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen(false);
                    onStartRename(node.id);
                  }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className={MENU_ITEM_CLASS}
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen(false);
                    onDuplicate(node.id);
                  }}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className={MENU_ITEM_DANGER_CLASS}
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen(false);
                    onDelete(node.id);
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}

function RenameInput({
  initialName,
  leadingIcon,
  onCommit,
  onCancel,
}: {
  initialName: string;
  leadingIcon: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  return (
    <>
      <span className="w-4" />
      <Icon name={leadingIcon} size={16} className="text-[#A7AFBF]" />
      <input
        autoFocus
        type="text"
        defaultValue={initialName}
        onClick={(event) => event.stopPropagation()}
        onFocus={(event) => event.currentTarget.select()}
        className="flex-1 bg-[#1A1F27] text-[#F3F4F6] border border-[#4F6EF7] rounded px-1 py-0.5 text-[12px] focus:outline-none"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onCommit(event.currentTarget.value);
          } else if (event.key === "Escape") {
            onCancel();
          }
        }}
        onBlur={(event) => onCommit(event.currentTarget.value)}
      />
    </>
  );
}
