import { useEffect, useState } from "react";
import type * as Y from "yjs";
import {
  DEFAULT_WORKSPACE_METADATA,
  initializeWorkspaceMetadataIfEmpty,
  readWorkspaceMetadata,
  subscribeWorkspaceMetadata,
} from "../services/WorkspaceFileSystemService";
import type { WorkspaceMetadata } from "../types/workspace";

export function useWorkspaceMetadata(doc: Y.Doc | null, seedMetadata?: Partial<WorkspaceMetadata>): WorkspaceMetadata {
  const [metadata, setMetadata] = useState<WorkspaceMetadata>(DEFAULT_WORKSPACE_METADATA);

  useEffect(() => {
    if (!doc) {
      return;
    }
    if (seedMetadata) {
      initializeWorkspaceMetadataIfEmpty(doc, seedMetadata);
    }
    setMetadata(readWorkspaceMetadata(doc));
    return subscribeWorkspaceMetadata(doc, setMetadata);
    // seedMetadata is intentionally excluded: it must only ever be applied
    // once, the very first time a freshly created workspace's Yjs doc is
    // initialized. Re-running on every seedMetadata identity change would
    // fight user edits made via Workspace Settings, and a rejoin or page
    // refresh has no seedMetadata, which is correct — the Yjs doc is
    // already seeded by then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  return metadata;
}
