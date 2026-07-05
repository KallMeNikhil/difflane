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
    <div className="relative min-h-screen w-full flex items-center justify-center bg-background overflow-hidden px-md py-xl">
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[#00174b]/50 blur-[160px] rounded-full pointer-events-none" />

      <m.div
        initial="hidden"
        animate="visible"
        variants={MODAL_IN}
        className={`relative w-full ${maxWidthClassName} bg-surface-container-low border border-outline-variant rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden z-10`}
      >
        <div className="flex-shrink-0 px-lg py-md border-b border-outline-variant/50 flex justify-between items-start gap-md">
          <div className="flex items-start gap-md">
            {icon && (
              <div className="w-10 h-10 rounded-lg bg-primary-container/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                <Icon name={icon} filled />
              </div>
            )}
            <div>
              <h1 className="font-headline-md text-headline-md text-on-surface mb-xs">{title}</h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">{description}</p>
            </div>
          </div>
          <IconButton icon="close" aria-label="Close" shape="square" onClick={onClose} />
        </div>

        <div className="flex-1 overflow-y-auto">{children}</div>

        <div className="flex-shrink-0 px-lg py-md border-t border-outline-variant/50 bg-surface-container/50">
          {footer}
        </div>
      </m.div>
    </div>
  );
}
