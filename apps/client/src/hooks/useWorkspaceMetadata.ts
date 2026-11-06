import { useEffect, useRef, useState } from "react";
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
  const seedMetadataRef = useRef(seedMetadata);
  seedMetadataRef.current = seedMetadata;

  useEffect(() => {
    if (!doc) {
      return;
    }
    if (seedMetadataRef.current) {
      initializeWorkspaceMetadataIfEmpty(doc, seedMetadataRef.current);
    }
    setMetadata(readWorkspaceMetadata(doc));
    return subscribeWorkspaceMetadata(doc, setMetadata);
  }, [doc]);

  return metadata;
}
