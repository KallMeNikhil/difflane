import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, IconButton } from "../common";

const MIN_PANEL_HEIGHT = 140;
const MAX_PANEL_HEIGHT = 640;
const DEFAULT_PANEL_HEIGHT = 260;

export type ConsoleTab = "output" | "terminal";

interface ConsolePanelProps {
  isOpen: boolean;
  activeTab: ConsoleTab;
  onTabChange: (tab: ConsoleTab) => void;
  onClose: () => void;
  isRunning: boolean;
  output: ReactNode;
  renderTerminal: (isVisible: boolean) => ReactNode;
}

export function ConsolePanel({ isOpen, activeTab, onTabChange, onClose, isRunning, output, renderTerminal }: ConsolePanelProps) {
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const [hasOpenedTerminal, setHasOpenedTerminal] = useState(false);
  const resizeStateRef = useRef<{ startY: number; startHeight: number } | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === "terminal") {
      setHasOpenedTerminal(true);
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      if (!resizeStateRef.current) return;
      const delta = resizeStateRef.current.startY - event.clientY;
      setPanelHeight(Math.min(MAX_PANEL_HEIGHT, Math.max(MIN_PANEL_HEIGHT, resizeStateRef.current.startHeight + delta)));
    }
    function handleMouseUp() {
      resizeStateRef.current = null;
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const tabClass = (tab: ConsoleTab) =>
    `h-full flex items-center gap-xs px-sm border-b-2 transition-colors font-label-sm text-[11px] tracking-widest uppercase ${
      activeTab === tab ? "border-primary text-on-surface" : "border-transparent text-on-surface-variant hover:text-on-surface"
    }`;

  return (
    <div
      className={`${isOpen ? "flex" : "hidden"} flex-col border-t border-outline-variant/50 bg-surface-container-lowest flex-shrink-0`}
      style={{ height: panelHeight }}
    >
      <div
        className="h-1.5 cursor-row-resize flex-shrink-0 hover:bg-primary/20 transition-colors"
        onMouseDown={(event) => {
          resizeStateRef.current = { startY: event.clientY, startHeight: panelHeight };
        }}
      />
      <div className="h-9 px-sm flex items-center justify-between border-b border-outline-variant/50 flex-shrink-0">
        <div className="h-full flex items-center" role="tablist">
          <button type="button" role="tab" aria-selected={activeTab === "output"} className={tabClass("output")} onClick={() => onTabChange("output")}>
            <Icon name={isRunning ? "progress_activity" : "output"} size={14} className={isRunning ? "animate-spin" : ""} />
            Output
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "terminal"} className={tabClass("terminal")} onClick={() => onTabChange("terminal")}>
            <Icon name="terminal" size={14} />
            Terminal
          </button>
        </div>
        <IconButton icon="close" size={16} shape="square" className="w-7 h-7" aria-label="Close panel" onClick={onClose} />
      </div>
      <div className={`${activeTab === "output" ? "flex" : "hidden"} flex-1 min-h-0`}>{output}</div>
      {hasOpenedTerminal && (
        <div className={`${activeTab === "terminal" ? "flex" : "hidden"} flex-1 min-h-0 flex-col`}>
          {renderTerminal(isOpen && activeTab === "terminal")}
        </div>
      )}
    </div>
  );
}
