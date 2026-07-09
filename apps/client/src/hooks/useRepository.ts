import { useCallback, useEffect, useRef, useState } from "react";
import type * as Y from "yjs";
import type { RepositorySummary } from "@difflane/shared-types";
import {
  applyImportResult,
  applyWorkspaceImport,
  importFileList,
  importLocalFolder,
  importRepository,
  importZipFile,
  isFileSystemAccessSupported,
  listBranches,
  parseRepositoryQuery,
  searchRepository,
  type WorkspaceImportPayload,
} from "../services/RepositoryService";

export type ImportSourceTab = "git" | "local" | "zip";
export type ImportStep = "source" | "importing" | "success" | "error";

export const IMPORT_PROGRESS_STEPS = [
  "Repository connected",
  "Files imported",
  "Building Workspace File System",
  "Preparing collaborative session",
] as const;

export interface ImportSuccessSummary {
  workspaceName: string;
  fileCount: number;
  detectedLanguage: string;
  sourceLabel: string;
}

const SEARCH_DEBOUNCE_MS = 400;
const PROGRESS_STEP_INTERVAL_MS = 550;

export function useRepository(doc: Y.Doc | null) {
  const [step, setStep] = useState<ImportStep>("source");
  const [sourceTab, setSourceTab] = useState<ImportSourceTab>("git");
  const [repositoryQuery, setRepositoryQuery] = useState("");
  const [repositorySummary, setRepositorySummary] = useState<RepositorySummary | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [progressStepIndex, setProgressStepIndex] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const [successSummary, setSuccessSummary] = useState<ImportSuccessSummary | null>(null);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runSearch = useCallback((query: string) => {
    const parsed = parseRepositoryQuery(query);
    if (!parsed) {
      setRepositorySummary(null);
      setBranches([]);
      setSearchError(null);
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    searchRepository(query)
      .then((summary) => {
        setRepositorySummary(summary);
        setSelectedBranch(summary.defaultBranch);
        return listBranches(parsed.owner, parsed.repo);
      })
      .then((fetchedBranches) => {
        if (fetchedBranches) {
          setBranches(fetchedBranches);
        }
      })
      .catch((error: unknown) => {
        setRepositorySummary(null);
        setBranches([]);
        setSearchError(error instanceof Error ? error.message : "Unable to find that repository.");
      })
      .finally(() => setSearchLoading(false));
  }, []);

  const handleQueryChange = useCallback(
    (value: string) => {
      setRepositoryQuery(value);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => runSearch(value), SEARCH_DEBOUNCE_MS);
    },
    [runSearch],
  );

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  const beginProgress = useCallback(() => {
    setStep("importing");
    setImportError(null);
    setProgressStepIndex(0);
    progressTimerRef.current = setInterval(() => {
      setProgressStepIndex((prev) => (prev < IMPORT_PROGRESS_STEPS.length - 2 ? prev + 1 : prev));
    }, PROGRESS_STEP_INTERVAL_MS);
  }, []);

  const finishProgressWithSuccess = useCallback((summary: ImportSuccessSummary) => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }
    setProgressStepIndex(IMPORT_PROGRESS_STEPS.length - 1);
    setSuccessSummary(summary);
    window.setTimeout(() => setStep("success"), 400);
  }, []);

  const finishProgressWithError = useCallback((message: string) => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }
    setImportError(message);
    setStep("error");
  }, []);

  const startImport = useCallback(() => {
    const parsed = parseRepositoryQuery(repositoryQuery);
    if (!parsed || !repositorySummary || !doc) {
      return;
    }
    beginProgress();
    importRepository(parsed.owner, parsed.repo, selectedBranch || repositorySummary.defaultBranch)
      .then((result) => {
        applyImportResult(doc, result);
        finishProgressWithSuccess({
          workspaceName: result.repository.name,
          fileCount: result.fileCount,
          detectedLanguage: result.detectedLanguage,
          sourceLabel: `github.com/${result.repository.fullName}`,
        });
      })
      .catch((error: unknown) => {
        finishProgressWithError(error instanceof Error ? error.message : "Import failed. Please try again.");
      });
  }, [repositoryQuery, repositorySummary, selectedBranch, doc, beginProgress, finishProgressWithSuccess, finishProgressWithError]);

  const applyLocalPayload = useCallback(
    (payload: WorkspaceImportPayload) => {
      if (!doc) {
        return;
      }
      applyWorkspaceImport(doc, payload);
      finishProgressWithSuccess({
        workspaceName: payload.sourceName,
        fileCount: payload.fileCount,
        detectedLanguage: payload.detectedLanguage,
        sourceLabel: payload.provider === "zip" ? `ZIP Archive: ${payload.sourceName}.zip` : `Local Folder: ${payload.sourceName}`,
      });
    },
    [doc, finishProgressWithSuccess],
  );

  const startLocalFolderImport = useCallback(async (): Promise<"handled" | "unsupported"> => {
    if (!isFileSystemAccessSupported()) {
      return "unsupported";
    }
    beginProgress();
    try {
      const payload = await importLocalFolder();
      if (!payload) {
        cancelImportSilently();
        return "handled";
      }
      applyLocalPayload(payload);
    } catch (error) {
      finishProgressWithError(error instanceof Error ? error.message : "Unable to import that folder.");
    }
    return "handled";

    function cancelImportSilently() {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
      setStep("source");
    }
  }, [beginProgress, applyLocalPayload, finishProgressWithError]);

  const importFromFileList = useCallback(
    (fileList: FileList) => {
      beginProgress();
      importFileList(fileList)
        .then(applyLocalPayload)
        .catch((error: unknown) => finishProgressWithError(error instanceof Error ? error.message : "Unable to import that folder."));
    },
    [beginProgress, applyLocalPayload, finishProgressWithError],
  );

  const importFromZipFile = useCallback(
    (file: File) => {
      beginProgress();
      importZipFile(file)
        .then(applyLocalPayload)
        .catch((error: unknown) => finishProgressWithError(error instanceof Error ? error.message : "Unable to import that archive."));
    },
    [beginProgress, applyLocalPayload, finishProgressWithError],
  );

  const cancelImport = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }
    setStep("source");
  }, []);

  const reset = useCallback(() => {
    setStep("source");
    setSourceTab("git");
    setRepositoryQuery("");
    setRepositorySummary(null);
    setBranches([]);
    setSelectedBranch("");
    setSearchError(null);
    setImportError(null);
    setSuccessSummary(null);
    setProgressStepIndex(0);
  }, []);

  return {
    step,
    sourceTab,
    setSourceTab,
    repositoryQuery,
    setRepositoryQuery: handleQueryChange,
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
  };
}
