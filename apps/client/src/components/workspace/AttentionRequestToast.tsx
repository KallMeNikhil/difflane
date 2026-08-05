import { m } from "framer-motion";
import { Avatar, Button, IconButton } from "../common";
import type { IncomingAttentionRequest } from "../../hooks/useRoom";

interface AttentionRequestToastProps {
  request: IncomingAttentionRequest;
  onJumpToUser: (userId: string) => void;
  onDismiss: () => void;
}

export function AttentionRequestToast({ request, onJumpToUser, onDismiss }: AttentionRequestToastProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="fixed top-20 right-md z-[80] w-80 bg-surface border border-outline rounded-xl shadow-2xl shadow-black/60 p-md"
      role="alert"
    >
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
              Jump to User
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={onDismiss}>
              Dismiss
            </Button>
          </div>
        </div>
        <IconButton icon="close" aria-label="Dismiss notification" onClick={onDismiss} size={16} />
      </div>
    </m.div>
  );
}
