import { useRef } from "react";
import { Icon } from "../common";
import { useRepository, IMPORT_PROGRESS_STEPS, type ImportSourceTab, type ImportSuccessSummary } from "../../hooks/useRepository";
import { useRoom } from "../../hooks/useRoom";
import { useModalDialog } from "../../hooks/useModalDialog";

interface ImportProjectModalProps {
  onClose: () => void;
  onOpenWorkspace: () => void;
}

const SOURCE_TABS: { id: ImportSourceTab; label: string; icon: string }[] = [
  { id: "git", label: "Git Repository", icon: "hub" },
  { id: "local", label: "Local Folder", icon: "folder" },
  { id: "zip", label: "ZIP Archive", icon: "archive" },
];

export function ImportProjectModal({ onClose, onOpenWorkspace }: ImportProjectModalProps) {
  const { doc } = useRoom();
  const {
    step,
    sourceTab,
    setSourceTab,
    repositoryQuery,
    setRepositoryQuery,
    repositorySummary,
    branches,
    selectedBranch,
    setSelectedBranch,
    searchLoading,
    searchError,
    progressStepIndex,
    importError,
    successSummary,
    startImport,
    startLocalFolderImport,
    importFromFileList,
    importFromZipFile,
    cancelImport,
    reset,
  } = useRepository(doc);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useModalDialog<HTMLDivElement>(onClose);

  async function handleChooseLocalFolder() {
    const outcome = await startLocalFolderImport();
    if (outcome === "unsupported") {
      folderInputRef.current?.click();
    }
  }

  function handleChooseZipFile() {
    zipInputRef.current?.click();
  }

  const cardWidthClass = step === "source" ? "max-w-3xl" : step === "success" ? "max-w-lg" : "max-w-[480px]";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-md bg-black/45 backdrop-blur-[10px]">
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error non-standard attribute enabling folder selection in browsers without the File System Access API
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files && event.target.files.length > 0) {
            importFromFileList(event.target.files);
          }
          event.target.value = "";
        }}
      />
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            importFromZipFile(file);
          }
          event.target.value = "";
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Import Project"
        tabIndex={-1}
        className={`bg-[#111318] border border-[#2A3140] rounded-xl w-full ${cardWidthClass} overflow-hidden flex flex-col max-h-[90vh] outline-none`}
      >
        {step === "source" && (
          <SourceSelectionView
            sourceTab={sourceTab}
            setSourceTab={setSourceTab}
            repositoryQuery={repositoryQuery}
            setRepositoryQuery={setRepositoryQuery}
            repositorySummary={repositorySummary}
            branches={branches}
            selectedBranch={selectedBranch}
            setSelectedBranch={setSelectedBranch}
            searchLoading={searchLoading}
            searchError={searchError}
            onClose={onClose}
            onImport={startImport}
            onChooseLocalFolder={handleChooseLocalFolder}
            onChooseZipFile={handleChooseZipFile}
          />
        )}
        {step === "importing" && <ProgressView progressStepIndex={progressStepIndex} onCancel={cancelImport} />}
        {step === "error" && <ErrorView message={importError} onRetry={reset} onClose={onClose} />}
        {step === "success" && successSummary && (
          <SuccessView
            summary={successSummary}
            onClose={onClose}
            onOpenWorkspace={() => {
              onOpenWorkspace();
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
}

function SourceSelectionView({
  sourceTab,
  setSourceTab,
  repositoryQuery,
  setRepositoryQuery,
  repositorySummary,
  branches,
  selectedBranch,
  setSelectedBranch,
  searchLoading,
  searchError,
  onClose,
  onImport,
  onChooseLocalFolder,
  onChooseZipFile,
}: {
  sourceTab: ImportSourceTab;
  setSourceTab: (tab: ImportSourceTab) => void;
  repositoryQuery: string;
  setRepositoryQuery: (value: string) => void;
  repositorySummary: import("@difflane/shared-types").RepositorySummary | null;
  branches: string[];
  selectedBranch: string;
  setSelectedBranch: (branch: string) => void;
  searchLoading: boolean;
  searchError: string | null;
  onClose: () => void;
  onImport: () => void;
  onChooseLocalFolder: () => void;
  onChooseZipFile: () => void;
}) {
  const canImport = sourceTab === "git" && Boolean(repositorySummary);

  return (
    <>
      <div className="flex items-center justify-between px-lg py-md border-b border-[#2A3140] shrink-0">
        <div>
          <h2 className="font-headline-md text-headline-md text-[#F3F4F6] font-semibold mb-xs">Import Project</h2>
          <p className="font-body-sm text-body-sm text-[#A7AFBF]">
            Import project files into your Workspace to begin a collaborative coding session.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[#A7AFBF] hover:text-[#F3F4F6] transition-colors rounded-full p-1 hover:bg-[#202632]"
          aria-label="Close"
        >
          <Icon name="close" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-lg flex flex-col gap-xl bg-[#111318]">
        <section>
          <h3 className="font-label-md text-label-md text-[#7B8496] mb-md uppercase tracking-wider">Source Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
            {SOURCE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSourceTab(tab.id)}
                className={`flex flex-col items-center justify-center p-md rounded-xl text-center transition-all relative ${
                  sourceTab === tab.id
                    ? "bg-[#4F6EF7]/15 border border-[#4F6EF7]"
                    : "bg-[#171A20] border border-[#232A36] hover:bg-[#202632] hover:border-[#2A3140]"
                }`}
              >
                <Icon name={tab.icon} size={28} className={sourceTab === tab.id ? "text-[#4F6EF7] mb-sm" : "text-[#A7AFBF] mb-sm"} />
                <span className={`font-label-md text-label-md ${sourceTab === tab.id ? "text-[#F3F4F6] font-semibold" : "text-[#A7AFBF]"}`}>
                  {tab.label}
                </span>
                {sourceTab === tab.id && <div className="absolute top-sm right-sm w-2 h-2 rounded-full bg-[#4F6EF7]" />}
              </button>
            ))}
          </div>
        </section>

        {sourceTab === "git" ? (
          <>
            <section className="flex flex-col gap-md">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                <div className="md:col-span-2 flex flex-col gap-xs">
                  <label className="font-label-sm text-label-sm text-[#7B8496] block" htmlFor="repo-search">
                    Repository
                  </label>
                  <div className="relative">
                    <Icon name="search" size={20} className="absolute left-md top-1/2 -translate-y-1/2 text-[#A7AFBF]" />
                    <input
                      id="repo-search"
                      type="text"
                      value={repositoryQuery}
                      onChange={(event) => setRepositoryQuery(event.target.value)}
                      placeholder="owner/repository"
                      className="w-full bg-[#1A1F27] text-[#F3F4F6] font-code text-code border border-[#2A3140] rounded-lg pl-xl pr-md py-sm focus:ring-1 focus:ring-[#4F6EF7] focus:border-[#4F6EF7] focus:outline-none transition-shadow"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-xs">
                  <label className="font-label-sm text-label-sm text-[#7B8496] block" htmlFor="branch-select">
                    Branch
                  </label>
                  <div className="relative">
                    <Icon name="call_split" size={16} className="absolute left-md top-1/2 -translate-y-1/2 text-[#A7AFBF]" />
                    <select
                      id="branch-select"
                      value={selectedBranch}
                      onChange={(event) => setSelectedBranch(event.target.value)}
                      disabled={branches.length === 0}
                      className="w-full bg-[#1A1F27] text-[#F3F4F6] font-code text-code border border-[#2A3140] rounded-lg pl-xl pr-md py-sm appearance-none focus:ring-1 focus:ring-[#4F6EF7] focus:border-[#4F6EF7] focus:outline-none transition-shadow cursor-pointer disabled:opacity-50"
                    >
                      {branches.length === 0 && <option value="">—</option>}
                      {branches.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}
                        </option>
                      ))}
                    </select>
                    <Icon name="expand_more" size={20} className="absolute right-md top-1/2 -translate-y-1/2 text-[#A7AFBF] pointer-events-none" />
                  </div>
                </div>
              </div>

              {searchLoading && <p className="font-body-sm text-body-sm text-[#7B8496]">Looking up repository…</p>}
              {searchError && <p className="font-body-sm text-body-sm text-error">{searchError}</p>}

              {repositorySummary && (
                <div className="bg-[#171A20] border border-[#232A36] rounded-lg p-md flex items-start gap-md">
                  <div className="w-10 h-10 rounded-lg bg-[#1A1F27] flex items-center justify-center shrink-0 border border-[#2A3140]">
                    <Icon name="code_blocks" className="text-[#A7AFBF]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-xs">
                      <h4 className="font-label-md text-label-md text-[#F3F4F6] font-semibold">{repositorySummary.fullName}</h4>
                      <span className="bg-[#1A1F27] border border-[#2A3140] text-[#A7AFBF] font-label-sm text-label-sm px-2 py-1 rounded-full flex items-center gap-1">
                        <Icon name="commit" size={14} />
                        {selectedBranch || repositorySummary.defaultBranch}
                      </span>
                    </div>
                    <div className="flex items-center gap-lg font-body-sm text-body-sm text-[#A7AFBF]">
                      <span className="flex items-center gap-1">
                        <Icon name="update" size={16} />
                        Updated {new Date(repositorySummary.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section>
              <div className="bg-[#171A20] border border-[#232A36] rounded-lg p-md flex items-start gap-sm">
                <Icon name="info" size={20} className="text-[#A7AFBF] shrink-0 mt-0.5" />
                <p className="font-body-sm text-body-sm text-[#A7AFBF]">
                  Repository access is used only to import and synchronize Workspace files. Imported files become part of the Workspace
                  File System.
                </p>
              </div>
            </section>
          </>
        ) : sourceTab === "local" ? (
          <section>
            <div className="bg-[#171A20] border border-[#232A36] rounded-lg p-lg flex flex-col items-center text-center gap-md">
              <div className="w-12 h-12 rounded-lg bg-[#1A1F27] border border-[#2A3140] flex items-center justify-center">
                <Icon name="folder_open" size={24} className="text-[#A7AFBF]" />
              </div>
              <div>
                <p className="font-label-md text-label-md text-[#F3F4F6] font-semibold mb-xs">Choose a folder from your device</p>
                <p className="font-body-sm text-body-sm text-[#A7AFBF] max-w-sm">
                  Files load directly into the Workspace File System. Nothing is uploaded to a server.
                </p>
              </div>
              <button
                type="button"
                onClick={onChooseLocalFolder}
                className="px-md py-sm rounded-lg font-label-md text-label-md text-[#F3F4F6] bg-[#4F6EF7] hover:bg-[#5B78FF] transition-colors flex items-center gap-sm"
              >
                <Icon name="drive_folder_upload" size={18} />
                Choose Folder
              </button>
            </div>
          </section>
        ) : (
          <section>
            <div className="bg-[#171A20] border border-[#232A36] rounded-lg p-lg flex flex-col items-center text-center gap-md">
              <div className="w-12 h-12 rounded-lg bg-[#1A1F27] border border-[#2A3140] flex items-center justify-center">
                <Icon name="folder_zip" size={24} className="text-[#A7AFBF]" />
              </div>
              <div>
                <p className="font-label-md text-label-md text-[#F3F4F6] font-semibold mb-xs">Choose a ZIP archive</p>
                <p className="font-body-sm text-body-sm text-[#A7AFBF] max-w-sm">
                  The archive is parsed in your browser and its folder structure is preserved in the Workspace File System.
                </p>
              </div>
              <button
                type="button"
                onClick={onChooseZipFile}
                className="px-md py-sm rounded-lg font-label-md text-label-md text-[#F3F4F6] bg-[#4F6EF7] hover:bg-[#5B78FF] transition-colors flex items-center gap-sm"
              >
                <Icon name="upload_file" size={18} />
                Choose ZIP File
              </button>
            </div>
          </section>
        )}
      </div>

      <div className="flex items-center justify-end px-lg py-md border-t border-[#2A3140] bg-[#111318] shrink-0 gap-md">
        <button
          type="button"
          onClick={onClose}
          className="px-md py-sm rounded-lg font-label-md text-label-md text-[#A7AFBF] bg-transparent border border-[#2A3140] hover:bg-[#171A20] transition-colors"
        >
          Cancel
        </button>
        {sourceTab === "git" && (
          <button
            type="button"
            disabled={!canImport}
            onClick={onImport}
            className="px-md py-sm rounded-lg font-label-md text-label-md text-[#F3F4F6] bg-[#4F6EF7] hover:bg-[#5B78FF] transition-colors flex items-center gap-sm disabled:opacity-40 disabled:pointer-events-none"
          >
            <Icon name="download" size={18} />
            Import Workspace
          </button>
        )}
      </div>
    </>
  );
}

function ProgressView({ progressStepIndex, onCancel }: { progressStepIndex: number; onCancel: () => void }) {
  const percent = Math.round(((progressStepIndex + 1) / IMPORT_PROGRESS_STEPS.length) * 100);

  return (
    <div className="p-lg flex flex-col gap-lg">
      <div className="flex flex-col gap-xs">
        <h2 className="font-headline-md text-headline-md text-[#F3F4F6]">Importing Workspace</h2>
        <p className="font-body-sm text-body-sm text-[#A7AFBF]">Preparing your collaborative workspace.</p>
      </div>

      <div className="flex flex-col gap-sm">
        <div className="flex justify-between items-end">
          <span className="font-label-md text-label-md text-[#7B8496] uppercase tracking-wider text-xs">Progress</span>
          <span className="font-label-md text-label-md text-[#4F6EF7]">{percent}%</span>
        </div>
        <div className="h-1.5 w-full bg-[#232A36] rounded-full overflow-hidden">
          <div className="h-full bg-[#4F6EF7] rounded-full transition-all duration-300" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="bg-[#171A20] border border-[#232A36] rounded-lg p-md flex flex-col gap-sm">
        {IMPORT_PROGRESS_STEPS.map((label, index) => {
          const isDone = index < progressStepIndex;
          const isActive = index === progressStepIndex;
          return (
            <div key={label} className="flex items-start gap-md py-xs">
              {isDone ? (
                <Icon name="check_circle" filled className="text-green-500 shrink-0" />
              ) : isActive ? (
                <Icon name="progress_activity" className="text-[#4F6EF7] shrink-0 animate-spin" />
              ) : (
                <Icon name="radio_button_unchecked" className="text-[#7B8496] shrink-0" />
              )}
              <span
                className={`font-body-sm text-body-sm ${
                  isDone ? "text-[#F3F4F6]" : isActive ? "text-[#4F6EF7] font-medium" : "text-[#7B8496]"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end items-center gap-md pt-sm border-t border-[#2A3140]">
        <button
          type="button"
          onClick={onCancel}
          className="px-md py-[10px] rounded-lg border border-[#2A3140] text-[#F3F4F6] bg-transparent font-label-md text-label-md hover:bg-[#171A20] transition-colors"
        >
          Cancel Import
        </button>
        <button
          type="button"
          disabled
          className="px-md py-[10px] rounded-lg bg-[#171A20] text-[#7B8496] font-label-md text-label-md cursor-not-allowed opacity-50 border border-transparent"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function ErrorView({ message, onRetry, onClose }: { message: string | null; onRetry: () => void; onClose: () => void }) {
  return (
    <div className="p-lg flex flex-col gap-lg">
      <div className="flex flex-col items-center text-center gap-md pb-0">
        <div className="w-16 h-16 rounded-full flex items-center justify-center border border-[#2A3140]">
          <Icon name="error" size={32} className="text-error" />
        </div>
        <div>
          <h2 className="font-headline-md text-headline-md text-[#F3F4F6] mb-sm">Import Failed</h2>
          <p className="font-body-md text-body-md text-[#A7AFBF] max-w-sm mx-auto">
            {message ?? "Something went wrong while importing this repository."}
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-md pt-sm border-t border-[#2A3140]">
        <button
          type="button"
          onClick={onClose}
          className="px-md py-sm rounded-lg font-label-md text-label-md text-[#A7AFBF] bg-transparent border border-[#2A3140] hover:bg-[#171A20] transition-colors"
        >
          Close
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="px-md py-sm rounded-lg font-label-md text-label-md text-[#F3F4F6] bg-[#4F6EF7] hover:bg-[#5B78FF] transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

function SuccessView({
  summary,
  onClose,
  onOpenWorkspace,
}: {
  summary: ImportSuccessSummary;
  onClose: () => void;
  onOpenWorkspace: () => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="p-lg flex flex-col items-center text-center pb-0">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-md border border-[#2A3140]">
          <Icon name="check_circle" filled size={36} className="text-green-500" />
        </div>
        <h2 className="font-headline-md text-headline-md text-[#F3F4F6] mb-sm">Workspace Ready</h2>
        <p className="font-body-md text-body-md text-[#A7AFBF] max-w-sm mx-auto">
          Your project has been successfully imported into the Workspace and is ready for collaborative review.
        </p>
      </div>
      <div className="p-lg pt-md">
        <div className="bg-[#171A20] rounded-lg border border-[#232A36] p-md flex flex-col gap-sm">
          <div className="flex justify-between items-center py-xs border-b border-[#232A36]">
            <span className="font-label-md text-label-md text-[#7B8496]">Workspace</span>
            <span className="font-label-md text-label-md text-[#F3F4F6] font-semibold">{summary.workspaceName}</span>
          </div>
          <div className="flex justify-between items-center py-xs border-b border-[#232A36]">
            <span className="font-label-md text-label-md text-[#7B8496]">Files Imported</span>
            <span className="font-label-md text-label-md text-[#F3F4F6] font-semibold">{summary.fileCount}</span>
          </div>
          <div className="flex justify-between items-center py-xs border-b border-[#232A36]">
            <span className="font-label-md text-label-md text-[#7B8496]">Detected Language</span>
            <div className="flex items-center gap-xs">
              <span className="w-2 h-2 rounded-full bg-[#4F6EF7]" />
              <span className="font-label-md text-label-md text-[#F3F4F6] font-semibold">{summary.detectedLanguage}</span>
            </div>
          </div>
          <div className="flex flex-col gap-xs pt-xs">
            <span className="font-label-sm text-label-sm text-[#7B8496] uppercase tracking-wider">Import Source</span>
            <div className="bg-[#111318] p-sm rounded border border-[#232A36] flex items-center gap-sm">
              <Icon name="folder_copy" size={16} className="text-[#7B8496]" />
              <span className="font-code text-code text-[#A7AFBF] truncate">{summary.sourceLabel}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="p-lg bg-[#111318] border-t border-[#2A3140] flex justify-end gap-md">
        <button
          type="button"
          onClick={onClose}
          className="px-md py-sm rounded-lg font-label-md text-label-md text-[#A7AFBF] bg-transparent border border-[#2A3140] hover:bg-[#171A20] transition-colors"
        >
          Close
        </button>
        <button
          type="button"
          onClick={onOpenWorkspace}
          className="px-md py-sm rounded-lg font-label-md text-label-md text-[#F3F4F6] bg-[#4F6EF7] hover:bg-[#5B78FF] transition-colors flex items-center gap-xs"
        >
          <span>Open Workspace</span>
          <Icon name="arrow_forward" size={16} />
        </button>
      </div>
    </div>
  );
}
