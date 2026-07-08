import { useEffect, type ReactNode } from "react";
import { m } from "framer-motion";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { MODAL_IN } from "../../constants/motion";

interface ModalShellProps {
  icon?: string;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  maxWidthClassName?: string;
}

export function ModalShell({
  icon,
  title,
  description,
  onClose,
  children,
  footer,
  maxWidthClassName = "max-w-[740px]",
}: ModalShellProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#0B0D12] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.03)_0%,transparent_80%)] overflow-hidden px-md py-xl">
      <m.div
        initial="hidden"
        animate="visible"
        variants={MODAL_IN}
        className={`relative w-full ${maxWidthClassName} bg-[#0E1117] border border-white/10 rounded-2xl shadow-2xl shadow-black/80 flex flex-col max-h-[85vh] overflow-hidden z-10`}
      >
        <div className="flex-shrink-0 px-lg py-md border-b border-white/5 flex justify-between items-start gap-md">
          <div className="flex items-start gap-md">
            {icon && (
              <div className="w-10 h-10 rounded-lg bg-[#161b22] border border-white/10 flex items-center justify-center text-primary flex-shrink-0">
                <Icon name={icon} filled />
              </div>
            )}
            <div>
              <h1 className="font-headline-md text-headline-md text-white mb-xs">{title}</h1>
              <p className="font-body-sm text-body-sm text-gray-400 max-w-md">{description}</p>
            </div>
          </div>
          <IconButton icon="close" aria-label="Close" shape="square" onClick={onClose} />
        </div>

        <div className="flex-1 overflow-y-auto">{children}</div>

        <div className="flex-shrink-0 px-lg py-md border-t border-white/5 bg-black/20">
          {footer}
        </div>
      </m.div>
    </div>
  );
}
