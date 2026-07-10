import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CodeEditor, DiffViewer, EditorTabsBar, EditorToolbar } from "../components/editor";
import {
  ChangesFileList,
  FileExplorerPanel,
  DiscussionPanel,
  DiscussionFullView,
  ImportProjectModal,
  ShareWorkspaceModal,
  WorkspaceEmptyState,
  WorkspaceIconRail,
  WorkspaceStatusBar,
  WorkspaceTopNav,
} from "../components/workspace";
import { PlaceholderNotice } from "../components/common";
import ErrorPage from "./Error";
import { useEditorTabs } from "../hooks/useEditorTabs";
import { useFileExplorer } from "../hooks/useFileExplorer";
import { useDiscussionThreads } from "../hooks/useDiscussionThreads";
import { useRoom } from "../hooks/useRoom";
import { useCurrentUser } from "../contexts/CurrentUserContext";
import { RoomProvider } from "../contexts/RoomContext";
import { MOCK_FILE_CONTENTS } from "../constants/mockFileContents";
import { MOCK_FILE_DIFFS } from "../constants/mockDiffData";
import { MOCK_DISCUSSION_FEED } from "../constants/mockDiscussionThreads";
import { MOCK_REPOSITORY_TREE, DEFAULT_ACTIVE_FILE_ID } from "../constants/mockRepository";
import { buildBreadcrumbPath, findNodeById, flattenToSeedEntries, getChangedFiles, toOpenTab } from "../services/FileTreeService";
import { applyImportResult, importRepository } from "../services/RepositoryService";
import { useRepositoryInfo } from "../hooks/useRepositoryInfo";
import { getStatusBadgeLabel } from "../utils/workspaceDisplay";
import type { DiffViewMode, FileNode, WorkspaceTopTab } from "../types/workspace";

const DEFAULT_ROOM_CODE = "DEMO-ROOM";

export default function Workspace() {
  const { roomCode: roomCodeParam } = useParams<{ roomCode?: string }>();
  const roomCode = roomCodeParam ? roomCodeParam.trim().toUpperCase() : DEFAULT_ROOM_CODE;

  return (
    <RoomProvider roomCode={roomCode}>
      <WorkspaceContent />
    </RoomProvider>
  );
}

function WorkspaceContent() {
  const { status, errorMessage, doc, awareness, setActiveFileId: publishActiveFileId } = useRoom();
  const { displayName, initials } = useCurrentUser();

  const [activeTopTab, setActiveTopTab] = useState<WorkspaceTopTab>("files");
  const [isShareOpen, setShareOpen] = useState(false);
  const [isImportOpen, setImportOpen] = useState(false);
  const [diffViewMode, setDiffViewMode] = useState<DiffViewMode>("unified");
  const repositoryInfo = useRepositoryInfo(doc);
  const [isSyncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const seed = useMemo(() => flattenToSeedEntries(MOCK_REPOSITORY_TREE), []);

  const {
    tree,
    activeFileId,
    setActiveFileId,
    selectedId,
    resolveCreateParentId,
    toggleFolder,
    collapseAll,
    createFile,
    createFolder,
    renameEntry,
    deleteEntry,
    duplicateEntry,
  } = useFileExplorer(seed, DEFAULT_ACTIVE_FILE_ID, doc);

  const initialActiveNode = findNodeById(MOCK_REPOSITORY_TREE, DEFAULT_ACTIVE_FILE_ID);
  const initialTabs = initialActiveNode ? [toOpenTab(MOCK_REPOSITORY_TREE, initialActiveNode)] : [];
  const { openTabs, activeTabId, setActiveTabId, openTab, closeTab } = useEditorTabs(
    initialTabs,
    DEFAULT_ACTIVE_FILE_ID,
    doc,
    tree,
  );

  const authorIdentity = useMemo(() => ({ name: displayName, initials }), [displayName, initials]);
  const { feed, stats, resolve, reply, create } = useDiscussionThreads(MOCK_DISCUSSION_FEED, doc, authorIdentity);

  const activeNode = findNodeById(tree, activeFileId);
  const breadcrumbPath = activeNode ? buildBreadcrumbPath(tree, activeNode.id) ?? [activeNode.name] : [];
  const activeDiff = activeNode ? MOCK_FILE_DIFFS[activeNode.id] : undefined;

  useEffect(() => {
    publishActiveFileId(activeFileId);
  }, [activeFileId, publishActiveFileId]);

  const anchorThread = useMemo(() => {
    if (!activeNode) {
      return undefined;
    }
    const match = feed.find(
      (item) => item.kind === "thread" && item.thread.status === "pending" && item.thread.anchor?.fileName === activeNode.name,
    );
    return match?.kind === "thread" ? match.thread : undefined;
  }, [feed, activeNode]);

  function handleSelectFile(node: FileNode) {
    setActiveFileId(node.id);
    openTab(toOpenTab(tree, node));
    setActiveTopTab("files");
  }

  function handleSelectTab(fileId: string) {
    setActiveTabId(fileId);
    setActiveFileId(fileId);
  }

  function handleDeleteEntry(id: string) {
    const removedIds = deleteEntry(id);
    if (removedIds.includes(activeFileId)) {
      const fallback = tree.find((node) => node.type === "file" && !removedIds.includes(node.id));
      if (fallback) {
        handleSelectFile(fallback);
      }
    }
    removedIds.forEach((removedId) => closeTab(removedId));
  }

  async function handleSync() {
    if (!repositoryInfo || repositoryInfo.provider !== "github" || !doc || isSyncing) {
      return;
    }
    setSyncing(true);
    try {
      const result = await importRepository(repositoryInfo.owner, repositoryInfo.name, repositoryInfo.branch);
      applyImportResult(doc, result);
      setNotice({ message: "Repository synced successfully", tone: "success" });
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : "Sync failed", tone: "error" });
    } finally {
      setSyncing(false);
    }
  }

  if (status === "error") {
    return (
      <ErrorPage
        title="Unable to Join Workspace"
        description={errorMessage ?? "We couldn't connect you to this workspace. Check the workspace code and try again."}
      />
    );
  }

  if (status === "joining") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <PlaceholderNotice
          icon="sync"
          title="Connecting to Workspace"
          description="Setting up your real-time collaboration session…"
        />
      </div>
    );
  }

  return (
    <div className="bg-background text-on-surface font-body-md text-body-md h-screen w-screen overflow-hidden flex flex-col">
      <WorkspaceTopNav activeTab={activeTopTab} onTabChange={setActiveTopTab} onOpenShare={() => setShareOpen(true)} />

      <main className="flex-1 flex overflow-hidden w-full relative">
        <WorkspaceIconRail activeTab={activeTopTab} onTabChange={setActiveTopTab} onOpenShare={() => setShareOpen(true)} />
        <FileExplorerPanel
          tree={tree}
          activeFileId={activeFileId}
          selectedId={selectedId}
          resolveCreateParentId={resolveCreateParentId}
          repositoryInfo={repositoryInfo}
          notice={notice}
          onDismissNotice={() => setNotice(null)}
          onToggleFolder={toggleFolder}
          onSelectFile={handleSelectFile}
          onCreateFile={(parentId, name) => createFile(parentId, name)}
          onCreateFolder={(parentId, name) => createFolder(parentId, name)}
          onRenameEntry={renameEntry}
          onDeleteEntry={handleDeleteEntry}
          onDuplicateEntry={duplicateEntry}
          onCollapseAll={collapseAll}
          onOpenImport={() => setImportOpen(true)}
          onSync={handleSync}
          isSyncing={isSyncing}
        />

        <section className="flex-1 flex flex-col h-full min-w-0 z-20">
          {activeTopTab === "files" && activeNode && (
            <>
              <EditorTabsBar tabs={openTabs} activeTabId={activeTabId} onSelectTab={handleSelectTab} onCloseTab={closeTab} />
              <EditorToolbar
                breadcrumb={breadcrumbPath.slice(0, -1)}
                activeFileName={activeNode.name}
                statusLabel={getStatusBadgeLabel(activeNode.status)}
                diffViewMode={activeDiff ? diffViewMode : undefined}
                onChangeDiffViewMode={activeDiff ? setDiffViewMode : undefined}
              />
              {activeDiff ? (
                <DiffViewer diff={activeDiff} viewMode={diffViewMode} anchorThread={anchorThread} onSubmitReply={reply} />
              ) : (
                <CodeEditor
                  fileId={activeNode.id}
                  language={activeNode.language ?? "plaintext"}
                  value={MOCK_FILE_CONTENTS[activeNode.id] ?? ""}
                  doc={doc}
                  awareness={awareness}
                />
              )}
            </>
          )}

          {activeTopTab === "files" && !activeNode && tree.length === 0 && (
            <WorkspaceEmptyState
              onOpenImport={() => setImportOpen(true)}
              onCreateFile={() => createFile(null, "untitled.ts")}
              onCreateFolder={() => createFolder(null, "New Folder")}
            />
          )}

          {activeTopTab === "files" && !activeNode && tree.length > 0 && (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant font-body-sm text-body-sm">
              Select a file to begin editing.
            </div>
          )}

          {activeTopTab === "changes" && (
            <ChangesFileList changedFiles={getChangedFiles(tree)} diffsByFileId={MOCK_FILE_DIFFS} onSelectFile={handleSelectFile} />
          )}

          {activeTopTab === "discussion" && <DiscussionFullView feed={feed} onResolve={resolve} onSubmitReply={reply} />}
        </section>

        <DiscussionPanel feed={feed} stats={stats} onResolve={resolve} onSubmitReply={reply} onCreateThread={create} />
      </main>

      <WorkspaceStatusBar />

      {isShareOpen && <ShareWorkspaceModal onClose={() => setShareOpen(false)} />}
      {isImportOpen && (
        <ImportProjectModal
          onClose={() => setImportOpen(false)}
          onOpenWorkspace={() => setNotice({ message: "Workspace initialized successfully", tone: "success" })}
        />
      )}
    </div>
  );
}
