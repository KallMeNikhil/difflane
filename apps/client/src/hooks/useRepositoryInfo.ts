import { useEffect, useState } from "react";
import type * as Y from "yjs";
import { readRepositoryInfo, subscribeRepositoryInfo } from "../services/WorkspaceFileSystemService";
import type { WorkspaceRepositoryInfo } from "../types/workspace";

export function useRepositoryInfo(doc: Y.Doc | null): WorkspaceRepositoryInfo | null {
  const [repositoryInfo, setRepositoryInfo] = useState<WorkspaceRepositoryInfo | null>(null);

  useEffect(() => {
    if (!doc) {
      return;
    }
    setRepositoryInfo(readRepositoryInfo(doc));
    return subscribeRepositoryInfo(doc, setRepositoryInfo);
  }, [doc]);

  return repositoryInfo;
}
