import { useEffect, useState } from "react";
import type { Awareness } from "y-protocols/awareness";
import { readWhiteboardPeers, type WhiteboardPeer } from "../lib/whiteboard/whiteboardPresence";

function samePeers(a: WhiteboardPeer[], b: WhiteboardPeer[]): boolean {
  return a.length === b.length && a.every((peer, index) => peer.clientId === b[index].clientId && peer.name === b[index].name && Boolean(peer.pointer) === Boolean(b[index].pointer));
}

export function useWhiteboardPresence(awareness: Awareness | null, selfUserId: string | null): WhiteboardPeer[] {
  const [peers, setPeers] = useState<WhiteboardPeer[]>([]);

  useEffect(() => {
    if (!awareness) {
      setPeers([]);
      return;
    }
    const update = () => {
      const next = readWhiteboardPeers(awareness.getStates(), awareness.clientID, selfUserId);
      setPeers((current) => (samePeers(current, next) ? current : next));
    };
    update();
    awareness.on("change", update);
    return () => awareness.off("change", update);
  }, [awareness, selfUserId]);

  return peers;
}
