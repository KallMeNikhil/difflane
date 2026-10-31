import type { WhiteboardPeer } from "../../lib/whiteboard/whiteboardPresence";

interface WhiteboardPresenceBarProps {
  peers: WhiteboardPeer[];
  onJump: (peer: WhiteboardPeer) => void;
}

const MAX_VISIBLE = 5;

export function WhiteboardPresenceBar({ peers, onJump }: WhiteboardPresenceBarProps) {
  if (peers.length === 0) {
    return <span className="hidden sm:inline text-[11px] text-on-surface-variant">Only you are here</span>;
  }
  const visible = peers.slice(0, MAX_VISIBLE);
  const hidden = peers.slice(MAX_VISIBLE);
  return (
    <div className="flex items-center gap-xs" aria-label="People on the whiteboard">
      <div className="flex -space-x-1.5">
        {visible.map((peer) => (
          <button
            key={peer.userId}
            type="button"
            onClick={() => onJump(peer)}
            title={peer.pointer ? `${peer.name} — click to jump to their cursor` : `${peer.name} is viewing the board`}
            className={`relative w-6 h-6 rounded-full border-2 border-surface-container-lowest text-[9px] font-bold text-[#0b0d12] flex items-center justify-center transition-transform hover:scale-110 hover:z-10 ${
              peer.pointer ? "" : "opacity-60"
            }`}
            style={{ backgroundColor: peer.color }}
          >
            {peer.initials}
            {peer.pointer && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-success-mint border border-surface-container-lowest" />}
          </button>
        ))}
        {hidden.length > 0 && (
          <span
            title={hidden.map((peer) => peer.name).join(", ")}
            className="w-6 h-6 rounded-full border-2 border-surface-container-lowest bg-surface-container-high text-[9px] font-bold text-on-surface flex items-center justify-center"
          >
            +{hidden.length}
          </span>
        )}
      </div>
      <span className="hidden sm:inline text-[11px] text-on-surface-variant">
        {peers.length === 1 ? `${peers[0].name} is here` : `${peers.length} others here`}
      </span>
    </div>
  );
}
