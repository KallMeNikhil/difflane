import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) {
    return [];
  }
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * Locks page scroll while a modal/overlay is mounted, restoring the previous
 * value on unmount. Use this directly (instead of useModalDialog) for
 * overlays that already implement their own bespoke keyboard handling.
 */
export function useBodyScrollLock(): void {
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);
}

/**
 * Shared behavior for modal/dialog overlays: locks page scroll while mounted,
 * traps Tab/Shift+Tab focus within the returned container ref, restores focus
 * to the previously focused element on close, and calls onClose on Escape.
 */
export function useModalDialog<T extends HTMLElement>(onClose: () => void) {
  const containerRef = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Intentionally runs once per mount only. Re-running this effect on every
  // render (e.g. because callers pass a new `onClose` function identity each
  // time, such as an inline arrow function recreated on every keystroke)
  // previously caused focus to be reset to the first focusable element on
  // every state update, making text inputs inside the dialog lose focus
  // after a single character. The latest `onClose` is still always invoked
  // via the ref below.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = getFocusableElements(containerRef.current);
    (focusable[0] ?? containerRef.current)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const elements = getFocusableElements(containerRef.current);
      if (elements.length === 0) {
        event.preventDefault();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return containerRef;
}
