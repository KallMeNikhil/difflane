import { useEffect, useState } from "react";
import { m } from "framer-motion";
import { Avatar, Button, IconButton } from "../common";
import type { IncomingAttentionRequest } from "../../hooks/useRoom";

interface AttentionRequestToastProps {
  request: IncomingAttentionRequest;
  onJumpToUser: (userId: string) => void;
  onDismiss: () => void;
}

const PROGRESS_TICK_MS = 100;

export function AttentionRequestToast({ request, onJumpToUser, onDismiss }: AttentionRequestToastProps) {
  const totalMs = Math.max(new Date(request.expiresAt).getTime() - new Date(request.receivedAt).getTime(), 1);
  const [remainingPercent, setRemainingPercent] = useState(() => {
    const remaining = new Date(request.expiresAt).getTime() - Date.now();
    return Math.min(100, Math.max(0, (remaining / totalMs) * 100));
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = new Date(request.expiresAt).getTime() - Date.now();
      setRemainingPercent(Math.min(100, Math.max(0, (remaining / totalMs) * 100)));
    }, PROGRESS_TICK_MS);
    return () => clearInterval(interval);
  }, [request.expiresAt, totalMs]);

  return (
    <m.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="fixed top-20 right-md z-[80] w-80 bg-surface border border-outline rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
      role="alert"
    >
      <div className="p-md">
        <div className="flex items-start gap-sm">
          <Avatar initials={request.fromInitials} tone="primary" />
          <div className="flex-1 min-w-0">
            <p className="font-body-sm text-body-sm text-on-surface">
              <span className="font-bold">{request.fromDisplayName}</span> requested your attention.
            </p>
            {request.fileLabel && (
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                Working in: <span className="font-code text-code">{request.fileLabel}</span>
              </p>
            )}
            <div className="flex items-center gap-sm mt-sm">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  onJumpToUser(request.fromUserId);
                  onDismiss();
                }}
              >
                Accept
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={onDismiss}>
                Reject
              </Button>
            </div>
          </div>
          <IconButton icon="close" aria-label="Dismiss notification" onClick={onDismiss} size={16} />
        </div>
      </div>
      <div className="h-1 w-full bg-outline-variant/40">
        <div
          className="h-full bg-primary"
          style={{ width: `${remainingPercent}%`, transition: `width ${PROGRESS_TICK_MS}ms linear` }}
        />
      </div>
    </m.div>
  );
}
