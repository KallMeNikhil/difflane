import { Icon, IconButton } from "../common";

interface PreviewPanelProps {
  html: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PreviewPanel({ html, isOpen, onClose }: PreviewPanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="flex flex-col border-t border-outline-variant/50 bg-surface-container-lowest flex-shrink-0" style={{ height: 320 }}>
      <div className="h-9 px-md flex items-center justify-between border-b border-outline-variant/50 flex-shrink-0">
        <div className="flex items-center gap-xs text-on-surface-variant font-label-sm text-[11px] tracking-widest uppercase">
          <Icon name="visibility" size={14} />
          Preview
        </div>
        <IconButton icon="close" size={16} shape="square" className="w-7 h-7" aria-label="Close preview" onClick={onClose} />
      </div>
      <iframe
        title="Sandboxed HTML/CSS preview"
        className="flex-1 min-h-0 w-full bg-white"
        srcDoc={html ?? ""}
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
