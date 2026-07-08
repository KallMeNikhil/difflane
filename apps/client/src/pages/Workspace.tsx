import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { CodeEditor, DiffViewer, EditorTabsBar, EditorToolbar } from "../components/editor";
import {
  ChangesFileList,
  FileExplorerPanel,
  DiscussionPanel,
  DiscussionFullView,
  ShareWorkspaceModal,
  WorkspaceIconRail,
  WorkspaceStatusBar,
  WorkspaceTopNav,
} from "../components/workspace";
import { useEditorTabs } from "../hooks/useEditorTabs";
import { useFileExplorer } from "../hooks/useFileExplorer";
import { useDiscussionThreads } from "../hooks/useDiscussionThreads";
import { useRoom } from "../hooks/useRoom";
import { useCurrentUser } from "../contexts/CurrentUserContext";
import { RoomProvider } from "../contexts/RoomContext";
import { MOCK_FILE_CONTENTS } from "../constants/mockFileContents";
import { MOCK_FILE_DIFFS } from "../constants/mockDiffData";
import { MOCK_DISCUSSION_FEED } from "../constants/mockDiscussionThreads";
import { DEFAULT_ACTIVE_FILE_ID, MOCK_REPOSITORY_TREE } from "../constants/mockRepository";
import { buildBreadcrumbPath, findNodeById, getChangedFiles, toOpenTab } from "../services/FileTreeService";
import { getStatusBadgeLabel } from "../utils/workspaceDisplay";
import type { DiffViewMode, FileNode, WorkspaceTopTab } from "../types/workspace";

interface WorkspaceLocationState {
  roomCode?: string;
}

export default function Workspace() {
  const location = useLocation();
  const roomCode = (location.state as WorkspaceLocationState | null)?.roomCode ?? "DEMO-ROOM";

  return (
    <RoomProvider roomCode={roomCode}>
      <WorkspaceContent />
    </RoomProvider>
  );
}

function WorkspaceContent() {
  const { doc, awareness, setActiveFileId: publishActiveFileId } = useRoom();
  const { displayName, initials } = useCurrentUser();

  const [activeTopTab, setActiveTopTab] = useState<WorkspaceTopTab>("files");
  const [isShareOpen, setShareOpen] = useState(false);
  const [diffViewMode, setDiffViewMode] = useState<DiffViewMode>("unified");

  const { tree, activeFileId, setActiveFileId, toggleFolder } = useFileExplorer(
    MOCK_REPOSITORY_TREE,
    DEFAULT_ACTIVE_FILE_ID,
    doc,
  );

  const initialActiveNode = findNodeById(MOCK_REPOSITORY_TREE, DEFAULT_ACTIVE_FILE_ID);
  const initialTabs = initialActiveNode ? [toOpenTab(MOCK_REPOSITORY_TREE, initialActiveNode)] : [];
  const { openTabs, activeTabId, setActiveTabId, openTab, closeTab } = useEditorTabs(
    initialTabs,
    DEFAULT_ACTIVE_FILE_ID,
    doc,
    tree,
  );

  const authorIdentity = useMemo(() => ({ name: displayName, initials }), [displayName, initials]);
  const { feed, stats, resolve, reply } = useDiscussionThreads(MOCK_DISCUSSION_FEED, doc, authorIdentity);

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

  return (
    <div className="bg-background text-on-surface font-body-md text-body-md h-screen w-screen overflow-hidden flex flex-col">
      <WorkspaceTopNav activeTab={activeTopTab} onTabChange={setActiveTopTab} onOpenShare={() => setShareOpen(true)} />

      <main className="flex-1 flex overflow-hidden w-full relative">
        <WorkspaceIconRail />
        <FileExplorerPanel tree={tree} activeFileId={activeFileId} onToggleFolder={toggleFolder} onSelectFile={handleSelectFile} />

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

          {activeTopTab === "changes" && (
            <ChangesFileList changedFiles={getChangedFiles(tree)} diffsByFileId={MOCK_FILE_DIFFS} onSelectFile={handleSelectFile} />
          )}

          {activeTopTab === "discussion" && <DiscussionFullView feed={feed} onResolve={resolve} onSubmitReply={reply} />}
        </section>

        <DiscussionPanel feed={feed} stats={stats} onResolve={resolve} onSubmitReply={reply} />
      </main>

      <WorkspaceStatusBar />

      {isShareOpen && <ShareWorkspaceModal onClose={() => setShareOpen(false)} />}
    </div>
  );
}
