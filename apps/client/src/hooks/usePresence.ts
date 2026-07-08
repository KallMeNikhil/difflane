import { useCallback, useEffect, useState } from "react";
import type { Awareness } from "y-protocols/awareness";
import { buildLocalAwarenessState, readRemoteCollaborators, type LocalIdentity } from "../services/PresenceService";
import type { Collaborator } from "../types/workspace";

export function usePresence(awareness: Awareness | null, identity: LocalIdentity) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>(() =>
    awareness ? readRemoteCollaborators(awareness) : [],
  );

  useEffect(() => {
    if (!awareness) {
      setCollaborators([]);
      return;
    }
    const handler = () => setCollaborators(readRemoteCollaborators(awareness));
    awareness.on("change", handler);
    handler();
    return () => {
      awareness.off("change", handler);
      awareness.setLocalState(null);
    };
  }, [awareness]);

  const setActiveFileId = useCallback(
    (activeFileId: string | null) => {
      awareness?.setLocalState(buildLocalAwarenessState(identity, activeFileId));
    },
    [awareness, identity],
  );

  return { collaborators, setActiveFileId };
}
