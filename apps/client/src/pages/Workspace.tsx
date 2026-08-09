import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useMonaco } from "@monaco-editor/react";
import type { editor as MonacoEditorNamespace } from "monaco-editor";
import { CodeEditor, DiffViewer, EditorTabsBar, EditorToolbar } from "../components/editor";
import type { ReviewGutterMarker } from "../components/editor/CodeEditor";
import { disposeMonacoModelForFile } from "../lib/monaco/monacoBinding";
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
  AttentionRequestToast,
} from "../components/workspace";
import {
  FileReviewStatusBadge,
  InlineReviewThread,
  NewReviewCommentComposer,
  ReviewFullView,
  ReviewNavigationControls,
  countReviewedFiles,
  getNextFileReviewStatus,
} from "../components/review";
import { PlaceholderNotice, StatusBadge } from "../components/common";
import { GlobalSearchModal } from "../components/search";
import { WorkspaceSettingsModal } from "../components/settings";
import { WorkspaceExportModal } from "../components/persistence";
import { SessionSummaryModal } from "../components/history";
import ErrorPage from "./Error";
import { useEditorTabs } from "../hooks/useEditorTabs";
import { useFileExplorer } from "../hooks/useFileExplorer";
import { useDiscussionThreads } from "../hooks/useDiscussionThreads";
import { useReview } from "../hooks/useReview";
import { useRoom } from "../hooks/useRoom";
import { useWorkspaceMetadata } from "../hooks/useWorkspaceMetadata";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { useNotifications } from "../hooks/useNotifications";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { RoomProvider } from "../contexts/RoomContext";
import { WorkspaceLifecycleProvider } from "../contexts/WorkspaceLifecycleContext";
import { WorkspaceRecoveryModal, RecoveryConflictModal, UnsavedChangesModal } from "../components/persistence";

import {
  buildBreadcrumbPath,
  countTreeStats,
  findNodeById,
  flattenToSeedEntries,
  getChangedFiles,
  toDeletedFileNode,
  toOpenTab,
} from "../services/FileTreeService";
import { applyImportResult, importRepository } from "../services/RepositoryService";
import { collectExportableFiles } from "../services/WorkspaceFileSystemService";
import { peekFileText } from "../services/CollaborationService";
import { buildFileDiff } from "../services/DiffService";
import { buildWorkspaceZipBlob, downloadBlob, slugifyWorkspaceName } from "../lib/zip/zipExport";
import { buildLiveSessionRecord } from "../services/SessionHistoryService";
import { useRepositoryInfo } from "../hooks/useRepositoryInfo";
import { getStatusBadgeLabel } from "../utils/workspaceDisplay";
import { ROUTES, buildWorkspacePath } from "../constants/routes";
import type { SearchSources } from "../services/SearchService";
import type { SearchResultItem } from "../types/search";
import type { FileReviewStatusRecord, ReviewAuthorIdentity, ReviewThread } from "../types/review";
import type {
  DiffViewMode,
  DiscussionFeedItem,
  FileDiff,
  FileNode,
  OpenEditorTab,
  WorkspaceCreationSeed,
  WorkspaceTopTab,
} from "../types/workspace";

const DEFAULT_ROOM_CODE = "DEMO-ROOM";
const EMPTY_REPOSITORY_TREE: FileNode[] = [];
const EMPTY_ACTIVE_FILE_ID = "";
const EMPTY_INITIAL_TABS: OpenEditorTab[] = [];
const EMPTY_DISCUSSION_FEED: DiscussionFeedItem[] = [];
const EMPTY_REVIEW_THREADS: ReviewThread[] = [];
const EMPTY_FILE_REVIEW_STATUS: FileReviewStatusRecord[] = [];

export default function Workspace() {
  const { roomCode: roomCodeParam } = useParams<{ roomCode?: string }>();
  const roomCode = roomCodeParam ? roomCodeParam.trim().toUpperCase() : DEFAULT_ROOM_CODE;

  return (
    <RoomProvider roomCode={roomCode}>
      <WorkspaceLifecycleProvider>
        <WorkspaceContent />
      </WorkspaceLifecycleProvider>
    </RoomProvider>
  );
}

function WorkspaceContent() {
  const {
    status,
    errorMessage,
    doc,
    awareness,
    roomCode,
    participants,
    collaborators,
    selfRole,
    setActiveFileId: publishActiveFileId,
    markTyping,
    persistenceStatus,
    persistenceErrorMessage,
    followedUserId,
    requestAttention,
    incomingAttention,
    dismissIncomingAttention,
  } = useRoom();
  const { userId, displayName, initials, isAuthenticated } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const creationSeed = location.state?.creationSeed as WorkspaceCreationSeed | undefined;
  const workspaceMetadata = useWorkspaceMetadata(doc, creationSeed);
  const { addNotification } = useNotifications();
  const [isUnsavedChangesDismissed, setUnsavedChangesDismissed] = useState(false);

  useEffect(() => {
    if (persistenceStatus !== "failed") {
      setUnsavedChangesDismissed(false);
    }
  }, [persistenceStatus]);

  const [activeTopTab, setActiveTopTab] = useState<WorkspaceTopTab>("files");
  const [isShareOpen, setShareOpen] = useState(false);
  const [isImportOpen, setImportOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isWorkspaceExportOpen, setWorkspaceExportOpen] = useState(false);
  const [isSessionSummaryOpen, setSessionSummaryOpen] = useState(false);
  const [sessionStartedAt] = useState(() => new Date().toISOString());
  const [diffViewMode, setDiffViewMode] = useState<DiffViewMode>("unified");
  const repositoryInfo = useRepositoryInfo(doc);
  const [isSyncing, setSyncing] = useState(false);
  const [isExporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const seed = useMemo(() => flattenToSeedEntries(EMPTY_REPOSITORY_TREE), []);

  const {
    tree,
    activeFileId,
    setActiveFileId,
    selectedId,
    toggleFolder,
    collapseAll,
    createFile,
    createFolder,
    renameEntry,
    setFileLanguage,
    deleteEntry,
    duplicateEntry,
    baselines,
    deletedFiles: deletedFileRecords,
  } = useFileExplorer(seed, EMPTY_ACTIVE_FILE_ID, doc);

  const { openTabs, activeTabId, setActiveTabId, openTab, closeTab: closeTabInternal } = useEditorTabs(
    EMPTY_INITIAL_TABS,
    EMPTY_ACTIVE_FILE_ID,
    tree,
  );
  const monaco = useMonaco();
  const activeEditorRef = useRef<MonacoEditorNamespace.IStandaloneCodeEditor | null>(null);
  const handleFormatDocument = useCallback(() => {
    activeEditorRef.current?.getAction("editor.action.formatDocument")?.run();
  }, []);
  const closeTab = useCallback(
    (id: string) => {
      closeTabInternal(id);
      disposeMonacoModelForFile(monaco, id);
    },
    [closeTabInternal, monaco],
  );

  const authorIdentity = useMemo(() => ({ name: displayName, initials }), [displayName, initials]);
  const { feed, stats, resolve, reply, create } = useDiscussionThreads(EMPTY_DISCUSSION_FEED, doc, authorIdentity);

  const reviewIdentity: ReviewAuthorIdentity = useMemo(
    () => ({
      id: userId,
      identityType: isAuthenticated ? "user" : "guest",
      initials,
      name: displayName,
    }),
    [userId, isAuthenticated, initials, displayName],
  );
  const review = useReview(doc, reviewIdentity, selfRole, EMPTY_REVIEW_THREADS, EMPTY_FILE_REVIEW_STATUS);
  const [openReviewThreadId, setOpenReviewThreadId] = useState<string | null>(null);
  const [newCommentLine, setNewCommentLine] = useState<number | null>(null);
  const [popoverTop, setPopoverTop] = useState(0);
  const workspaceIdRef = useRef(roomCode);
  workspaceIdRef.current = roomCode;

  const activeSessionRecord = useMemo(() => {
    const { folderCount, fileCount } = countTreeStats(tree);
    return buildLiveSessionRecord({
      roomCode,
      workspace: workspaceMetadata,
      repository: repositoryInfo,
      folderCount,
      fileCount,
      counts: {
        filesReviewed: countReviewedFiles(review.fileStatusRecords),
        discussionsCreated: stats.resolvedCount + stats.pendingCount,
        discussionsResolved: stats.resolvedCount,
      },
      participants,
      startedAt: sessionStartedAt,
      lastActivityAt: new Date().toISOString(),
    });
  }, [roomCode, workspaceMetadata, repositoryInfo, tree, review.fileStatusRecords, stats, participants, sessionStartedAt]);

  const searchSources: SearchSources = useMemo(
    () => ({
      fileTree: tree,
      openTabs,
      sessions: [activeSessionRecord],
      repositories: repositoryInfo ? [{ id: repositoryInfo.name, name: repositoryInfo.name, detail: `${repositoryInfo.branch} • Imported` }] : [],
      collaborators: participants.map((participant) => ({
        id: participant.userId,
        name: participant.displayName,
        role: participant.role,
      })),
    }),
    [tree, openTabs, activeSessionRecord, repositoryInfo, participants],
  );
  const search = useGlobalSearch(searchSources);

  function handleSelectSearchResult(item: SearchResultItem) {
    if (item.fileId) {
      const node = findNodeById(tree, item.fileId);
      if (node) {
        handleSelectFile(node);
      }
    } else if (item.roomCode && item.category === "sessions") {
      navigate(buildWorkspacePath(item.roomCode));
    }
    search.close();
  }

  const activeNode = findNodeById(tree, activeFileId);
  const lastKnownActiveFileIdRef = useRef<string | null>(null);
  const locallyRemovedFileIdsRef = useRef<Set<string>>(new Set());
  const breadcrumbPath = activeNode ? buildBreadcrumbPath(tree, activeNode.id) ?? [activeNode.name] : [];
  const [viewingDeletedFileId, setViewingDeletedFileId] = useState<string | null>(null);
  const [diffPreviewFileId, setDiffPreviewFileId] = useState<string | null>(null);

  function getFileTextById(fileId: string): string {
    if (doc) {
      return peekFileText(doc, fileId);
    }
    return "";
  }

  const deletedFileNodes = useMemo(() => deletedFileRecords.map(toDeletedFileNode), [deletedFileRecords]);
  const changedFiles = useMemo(() => getChangedFiles(tree, deletedFileNodes), [tree, deletedFileNodes]);

  const diffsByFileId = useMemo(() => {
    const map: Record<string, FileDiff> = {};
    for (const file of changedFiles) {
      if (file.status === "deleted") {
        const record = deletedFileRecords.find((candidate) => candidate.id === file.id);
        if (record) {
          map[file.id] = buildFileDiff(file.id, record.path, record.language, record.content, "");
        }
        continue;
      }
      const path = buildBreadcrumbPath(tree, file.id)?.join("/") ?? file.name;
      const baseline = baselines[file.id] ?? "";
      const current = getFileTextById(file.id);
      map[file.id] = buildFileDiff(file.id, path, file.language ?? "plaintext", baseline, current);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedFiles, baselines, tree, doc]);

  const viewingDeletedFile = viewingDeletedFileId
    ? deletedFileRecords.find((record) => record.id === viewingDeletedFileId)
    : undefined;

  const activeDiff: FileDiff | undefined =
    activeNode && diffPreviewFileId === activeNode.id ? diffsByFileId[activeNode.id] : undefined;

  const activeFileText = useMemo(
    () => (activeNode ? getFileTextById(activeNode.id) : ""),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc, activeNode],
  );

  const activeFileReviewThreads = useMemo(
    () => (activeNode ? review.threadsForFile(activeNode.id) : []),
    [activeNode, review],
  );

  const reviewMarkers: ReviewGutterMarker[] = useMemo(
    () =>
      activeFileReviewThreads.map((thread) => {
        const resolvedAnchor = review.resolveAnchor(thread.anchor, activeFileText);
        return {
          threadId: thread.id,
          line: resolvedAnchor.line,
          resolved: thread.status === "resolved",
          orphaned: resolvedAnchor.confidence === "orphaned",
        };
      }),
    [activeFileReviewThreads, activeFileText, review],
  );

  const openReviewThread = openReviewThreadId ? review.threads.find((thread) => thread.id === openReviewThreadId) : undefined;

  useEffect(() => {
    setOpenReviewThreadId(null);
    setNewCommentLine(null);
  }, [activeFileId]);

  function handleReviewMarkerClick(threadId: string, top: number) {
    setNewCommentLine(null);
    setOpenReviewThreadId(threadId);
    setPopoverTop(top);
    review.selectThread(threadId);
  }

  function handleReviewGutterClick(lineNumber: number, top: number) {
    if (!review.permissions.canCreate) {
      return;
    }
    setOpenReviewThreadId(null);
    setNewCommentLine(lineNumber);
    setPopoverTop(top);
  }

  function handleSubmitNewReviewComment(body: string) {
    if (!activeNode || newCommentLine === null) {
      return;
    }
    review.createThread({
      workspaceId: workspaceIdRef.current,
      fileId: activeNode.id,
      filePath: breadcrumbPath.length > 0 ? breadcrumbPath.join("/") : activeNode.name,
      startLine: newCommentLine,
      endLine: newCommentLine,
      startColumn: 1,
      endColumn: 1,
      fileText: activeFileText,
      body,
    });
    setNewCommentLine(null);
  }

  function handleJumpToReviewThread(thread: { id: string; fileId: string }) {
    if (thread.fileId !== activeFileId) {
      const node = findNodeById(tree, thread.fileId);
      if (node) {
        handleSelectFile(node);
      }
    }
    setActiveTopTab("files");
    setOpenReviewThreadId(thread.id);
    setNewCommentLine(null);
  }

  useEffect(() => {
    publishActiveFileId(activeFileId);
  }, [activeFileId, publishActiveFileId]);

  useEffect(() => {
    if (!followedUserId) {
      return;
    }
    const followed = collaborators.find((collaborator) => collaborator.id === followedUserId);
    if (!followed || !followed.activeFileId || followed.activeFileId === activeFileId) {
      return;
    }
    const node = findNodeById(tree, followed.activeFileId);
    if (node) {
      handleSelectFileRef.current(node);
    }
  }, [followedUserId, collaborators, activeFileId, tree]);

  function handleJumpToUser(userId: string) {
    const target = collaborators.find((collaborator) => collaborator.id === userId);
    if (!target || !target.activeFileId) {
      return;
    }
    const node = findNodeById(tree, target.activeFileId);
    if (node) {
      handleSelectFile(node);
    }
  }

  function handleRequestAttention(targetConnectionId: string) {
    requestAttention(targetConnectionId, { fileId: activeFileId || null, fileLabel: activeNode?.name ?? null });
  }

  function getFileNameById(fileId: string | null): string | null {
    if (!fileId) {
      return null;
    }
    return findNodeById(tree, fileId)?.name ?? null;
  }

  function getFilePresence(fileId: string): { viewing: number; editing: number } {
    let viewing = 0;
    let editing = 0;
    for (const collaborator of collaborators) {
      if (collaborator.activeFileId !== fileId) {
        continue;
      }
      if (collaborator.activityState === "editing" || collaborator.activityState === "typing") {
        editing += 1;
      } else {
        viewing += 1;
      }
    }
    return { viewing, editing };
  }

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
    setViewingDeletedFileId(null);
    setDiffPreviewFileId(null);
    setActiveFileId(node.id);
    openTab(toOpenTab(tree, node));
    setActiveTopTab("files");
  }

  const handleSelectFileRef = useRef(handleSelectFile);
  handleSelectFileRef.current = handleSelectFile;

  function handleSelectChangedFile(node: FileNode) {
    if (node.status === "deleted") {
      setDiffPreviewFileId(null);
      setViewingDeletedFileId(node.id);
      setActiveTopTab("files");
      return;
    }
    setViewingDeletedFileId(null);
    setActiveFileId(node.id);
    openTab(toOpenTab(tree, node));
    setActiveTopTab("files");
    setDiffPreviewFileId(node.status === "modified" ? node.id : null);
  }

  function handleSelectTab(fileId: string) {
    setViewingDeletedFileId(null);
    setDiffPreviewFileId(null);
    setActiveTabId(fileId);
    setActiveFileId(fileId);
  }

  function handleDeleteEntry(id: string) {
    const removedIds = deleteEntry(id);
    removedIds.forEach((removedId) => locallyRemovedFileIdsRef.current.add(removedId));
    if (removedIds.includes(activeFileId)) {
      const fallback = tree.find((node) => node.type === "file" && !removedIds.includes(node.id));
      if (fallback) {
        handleSelectFile(fallback);
      }
    }
    removedIds.forEach((removedId) => closeTab(removedId));
  }

  useEffect(() => {
    if (activeNode) {
      lastKnownActiveFileIdRef.current = activeNode.id;
      return;
    }
    if (!activeFileId || activeFileId !== lastKnownActiveFileIdRef.current) {
      return;
    }
    lastKnownActiveFileIdRef.current = null;
    if (locallyRemovedFileIdsRef.current.has(activeFileId)) {
      locallyRemovedFileIdsRef.current.delete(activeFileId);
      return;
    }
    const fallback = tree.find((node) => node.type === "file");
    if (fallback) {
      handleSelectFileRef.current(fallback);
    }
    addNotification({
      category: "workspace",
      icon: "delete",
      tone: "warning",
      message: "A collaborator deleted the file you had open",
      targetLabel: workspaceMetadata.name,
      roomCode,
    });
  }, [activeNode, activeFileId, tree, workspaceMetadata.name, roomCode, addNotification]);

  function handleResolveThread(threadId: string) {
    const match = feed.find((item) => item.kind === "thread" && item.thread.id === threadId);
    const fileName = match?.kind === "thread" ? match.thread.anchor?.fileName : undefined;
    resolve(threadId);
    addNotification({
      category: "discussions",
      icon: "task_alt",
      tone: "success",
      actorName: displayName,
      actorInitials: initials,
      message: `${displayName} resolved a discussion${fileName ? ` in ${fileName}` : ""}`,
      targetLabel: fileName ?? workspaceMetadata.name,
      roomCode,
      actions: [{ id: "open", label: "Open Discussion", kind: "openDiscussion", emphasis: "secondary" }],
    });
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
      addNotification({
        category: "workspace",
        icon: "sync",
        tone: "success",
        message: `${repositoryInfo.owner}/${repositoryInfo.name} synced successfully`,
        targetLabel: workspaceMetadata.name,
        roomCode,
        actions: [{ id: "open", label: "Open Workspace", kind: "openWorkspace", emphasis: "secondary" }],
      });
    } catch (error) {
      const failureMessage = error instanceof Error ? error.message : "Sync failed";
      setNotice({ message: failureMessage, tone: "error" });
      addNotification({
        category: "workspace",
        icon: "sync_problem",
        tone: "warning",
        message: `${repositoryInfo.owner}/${repositoryInfo.name} failed to sync: ${failureMessage}`,
        targetLabel: workspaceMetadata.name,
        roomCode,
        actions: [],
      });
    } finally {
      setSyncing(false);
    }
  }

  async function handleExportWorkspace() {
    if (!doc || isExporting) {
      return;
    }
    if (tree.length === 0) {
      setNotice({ message: "There are no files to export yet", tone: "error" });
      return;
    }
    setExporting(true);
    try {
      const files = collectExportableFiles(doc, tree);
      const blob = await buildWorkspaceZipBlob(files);
      downloadBlob(blob, `${slugifyWorkspaceName(workspaceMetadata.name)}.zip`);
      setNotice({ message: "Workspace exported successfully", tone: "success" });
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : "Export failed", tone: "error" });
    } finally {
      setExporting(false);
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
      <WorkspaceTopNav
        activeTab={activeTopTab}
        onTabChange={setActiveTopTab}
        onNavigateHome={() => navigate(ROUTES.dashboard)}
        onOpenShare={() => setShareOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenSessionSummary={() => setSessionSummaryOpen(true)}
        onDownloadZip={handleExportWorkspace}
        isDownloadingZip={isExporting}
        onOpenWorkspaceExport={() => setWorkspaceExportOpen(true)}
        onJumpToUser={handleJumpToUser}
        onRequestAttention={handleRequestAttention}
        fileNameById={getFileNameById}
      />

      <main className="flex-1 flex overflow-hidden w-full relative">
        <WorkspaceIconRail
          activeTab={activeTopTab}
          onTabChange={setActiveTopTab}
          onOpenShare={() => setShareOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenHistory={() => setSessionSummaryOpen(true)}
          onOpenSearch={search.open}
        />
        <FileExplorerPanel
          tree={tree}
          activeFileId={activeFileId}
          selectedId={selectedId}
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
          getReviewStatus={review.getFileStatusFor}
          getFilePresence={getFilePresence}
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
                onFormatDocument={!activeDiff && selfRole !== "viewer" ? handleFormatDocument : undefined}
                rightSlot={
                  !activeDiff && (
                    <div className="flex items-center gap-sm">
                      {selfRole === "viewer" && (
                        <StatusBadge label="Viewer · Read-only" tone="neutral" />
                      )}
                      <ReviewNavigationControls
                        count={activeFileReviewThreads.length}
                        onPrevious={() => review.goToAdjacentThread(activeNode.id, "previous")}
                        onNext={() => review.goToAdjacentThread(activeNode.id, "next")}
                      />
                      <FileReviewStatusBadge
                        status={review.getFileStatusFor(activeNode.id)}
                        interactive={review.permissions.canSetFileStatus}
                        onCycle={() =>
                          review.setFileStatus(activeNode.id, getNextFileReviewStatus(review.getFileStatusFor(activeNode.id)))
                        }
                      />
                    </div>
                  )
                }
              />
              {activeDiff ? (
                <DiffViewer diff={activeDiff} viewMode={diffViewMode} anchorThread={anchorThread} onSubmitReply={reply} />
              ) : (
                <div className="relative flex-1 min-h-0">
                  <CodeEditor
                    fileId={activeNode.id}
                    language={activeNode.language ?? "plaintext"}
                    value={activeFileText}
                    doc={doc}
                    awareness={awareness}
                    reviewMarkers={reviewMarkers}
                    onReviewMarkerClick={handleReviewMarkerClick}
                    onReviewGutterClick={handleReviewGutterClick}
                    onTypingActivity={markTyping}
                    readOnly={selfRole === "viewer"}
                    cursorPresenceEnabled={workspaceMetadata.collaboration.cursorPresence}
                    onEditorMount={(instance) => {
                      activeEditorRef.current = instance;
                    }}
                  />
                  {openReviewThread && (
                    <InlineReviewThread
                      thread={openReviewThread}
                      anchorConfidence={review.resolveAnchor(openReviewThread.anchor, activeFileText).confidence}
                      permissions={review.permissions}
                      style={{ top: popoverTop }}
                      onReply={review.reply}
                      onResolve={review.resolve}
                      onReopen={review.reopen}
                      onDeleteThread={(threadId) => {
                        review.removeThread(threadId);
                        setOpenReviewThreadId(null);
                      }}
                      onClose={() => setOpenReviewThreadId(null)}
                    />
                  )}
                  {newCommentLine !== null && (
                    <NewReviewCommentComposer
                      lineNumber={newCommentLine}
                      style={{ top: popoverTop }}
                      onSubmit={handleSubmitNewReviewComment}
                      onClose={() => setNewCommentLine(null)}
                    />
                  )}
                </div>
              )}
            </>
          )}

          {activeTopTab === "files" && !activeNode && viewingDeletedFile && diffsByFileId[viewingDeletedFile.id] && (
            <>
              <EditorToolbar
                breadcrumb={viewingDeletedFile.path.split("/").slice(0, -1)}
                activeFileName={viewingDeletedFile.name}
                statusLabel={getStatusBadgeLabel("deleted")}
                diffViewMode={diffViewMode}
                onChangeDiffViewMode={setDiffViewMode}
              />
              <DiffViewer diff={diffsByFileId[viewingDeletedFile.id]} viewMode={diffViewMode} onSubmitReply={reply} />
            </>
          )}

          {activeTopTab === "files" && !activeNode && !viewingDeletedFile && tree.length === 0 && (
            <WorkspaceEmptyState
              onOpenImport={() => setImportOpen(true)}
              onCreateFile={() => createFile(null, "untitled.ts")}
              onCreateFolder={() => createFolder(null, "New Folder")}
            />
          )}

          {activeTopTab === "files" && !activeNode && !viewingDeletedFile && tree.length > 0 && (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant font-body-sm text-body-sm">
              Select a file to begin editing.
            </div>
          )}

          {activeTopTab === "changes" && (
            <ChangesFileList
              changedFiles={changedFiles}
              diffsByFileId={diffsByFileId}
              onSelectFile={handleSelectChangedFile}
              getReviewStatus={review.getFileStatusFor}
            />
          )}

          {activeTopTab === "discussion" && <DiscussionFullView feed={feed} onResolve={handleResolveThread} onSubmitReply={reply} />}

          {activeTopTab === "review" && (
            <ReviewFullView
              threads={review.threads}
              permissions={review.permissions}
              resolveAnchorConfidence={(thread) => review.resolveAnchor(thread.anchor, getFileTextById(thread.fileId)).confidence}
              onReply={review.reply}
              onResolve={review.resolve}
              onReopen={review.reopen}
              onDeleteThread={review.removeThread}
              onJumpToThread={handleJumpToReviewThread}
            />
          )}
        </section>

        <DiscussionPanel
          feed={feed}
          discussionsEnabled={workspaceMetadata.collaboration.inlineDiscussions}
          stats={stats}
          author={authorIdentity}
          onResolve={handleResolveThread}
          onSubmitReply={reply}
          onCreateThread={create}
        />
      </main>

      <WorkspaceStatusBar
        activeFileLanguage={activeTopTab === "files" ? activeNode?.language : undefined}
        onChangeActiveFileLanguage={activeNode ? (language) => setFileLanguage(activeNode.id, language) : undefined}
        canEditLanguage={selfRole !== "viewer"}
      />

      <WorkspaceRecoveryModal />
      <RecoveryConflictModal />
      {persistenceStatus === "failed" && !isUnsavedChangesDismissed && (
        <UnsavedChangesModal message={persistenceErrorMessage} onDismiss={() => setUnsavedChangesDismissed(true)} />
      )}

      {isShareOpen && <ShareWorkspaceModal onClose={() => setShareOpen(false)} />}
      {isSettingsOpen && <WorkspaceSettingsModal onClose={() => setSettingsOpen(false)} />}
      {isWorkspaceExportOpen && (
        <WorkspaceExportModal workspaceName={workspaceMetadata.name} onClose={() => setWorkspaceExportOpen(false)} />
      )}
      {isSessionSummaryOpen && activeSessionRecord && (
        <SessionSummaryModal
          record={activeSessionRecord}
          onClose={() => setSessionSummaryOpen(false)}
          onOpenWorkspace={() => setSessionSummaryOpen(false)}
          onOpenHistory={() => {
            setSessionSummaryOpen(false);
            window.open(ROUTES.history, "_blank", "noopener,noreferrer");
          }}
        />
      )}
      {isImportOpen && (
        <ImportProjectModal
          onClose={() => setImportOpen(false)}
          onOpenWorkspace={() => {
            setNotice({ message: "Workspace initialized successfully", tone: "success" });
            addNotification({
              category: "workspace",
              icon: "folder_zip",
              tone: "success",
              message: repositoryInfo
                ? `${repositoryInfo.owner}/${repositoryInfo.name} imported into ${workspaceMetadata.name}`
                : `${workspaceMetadata.name} was initialized`,
              targetLabel: workspaceMetadata.name,
              roomCode,
              actions: [{ id: "open", label: "Open Workspace", kind: "openWorkspace", emphasis: "secondary" }],
            });
          }}
        />
      )}
      {search.isOpen && (
        <GlobalSearchModal
          query={search.query}
          onQueryChange={search.setQuery}
          filter={search.filter}
          onFilterChange={search.setFilter}
          availableCategories={search.filters}
          groupedResults={search.groupedResults}
          resultCount={search.results.length}
          onSelectResult={handleSelectSearchResult}
          onClose={search.close}
        />
      )}
      {incomingAttention && (
        <AttentionRequestToast request={incomingAttention} onJumpToUser={handleJumpToUser} onDismiss={dismissIncomingAttention} />
      )}
    </div>
  );
}
