import type { ReactNode } from "react";
import { m } from "framer-motion";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { MODAL_IN } from "../../constants/motion";
import { useModalDialog } from "../../hooks/useModalDialog";

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
  const dialogRef = useModalDialog<HTMLDivElement>(onClose);

  return (
    <div className="fixed inset-0 z-[60] w-full flex items-center justify-center bg-background bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.03)_0%,transparent_80%)] overflow-y-auto px-md py-xl">
      <m.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-shell-title"
        aria-describedby="modal-shell-description"
        tabIndex={-1}
        initial="hidden"
        animate="visible"
        variants={MODAL_IN}
        className={`relative w-full ${maxWidthClassName} bg-surface border border-outline-variant rounded-2xl shadow-2xl shadow-black/80 flex flex-col max-h-[85vh] overflow-hidden z-10 outline-none`}
      >
        <div className="flex-shrink-0 px-lg py-md border-b border-outline-variant flex justify-between items-start gap-md">
          <div className="flex items-start gap-md">
            {icon && (
              <div className="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center text-primary flex-shrink-0">
                <Icon name={icon} filled />
              </div>
            )}
            <div>
              <h1 id="modal-shell-title" className="font-headline-md text-headline-md text-on-surface mb-xs">{title}</h1>
              <p id="modal-shell-description" className="font-body-sm text-body-sm text-on-surface-variant max-w-md">{description}</p>
            </div>
          </div>
          <IconButton icon="close" aria-label="Close" shape="square" onClick={onClose} />
        </div>

        <div className="flex-1 overflow-y-auto">{children}</div>

        <div className="flex-shrink-0 px-lg py-md border-t border-outline-variant bg-surface-container-low">
          {footer}
        </div>
      </m.div>
    </div>
  );
}
