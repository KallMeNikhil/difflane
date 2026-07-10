import { useEffect, useState } from "react";
import type * as Y from "yjs";
import { DEFAULT_WORKSPACE_METADATA, readWorkspaceMetadata, subscribeWorkspaceMetadata } from "../services/WorkspaceFileSystemService";
import type { WorkspaceMetadata } from "../types/workspace";

export function useWorkspaceMetadata(doc: Y.Doc | null): WorkspaceMetadata {
  const [metadata, setMetadata] = useState<WorkspaceMetadata>(DEFAULT_WORKSPACE_METADATA);

  useEffect(() => {
    if (!doc) {
      return;
    }
    setMetadata(readWorkspaceMetadata(doc));
    return subscribeWorkspaceMetadata(doc, setMetadata);
  }, [doc]);

  return metadata;
}
