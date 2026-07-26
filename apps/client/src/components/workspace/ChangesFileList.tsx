import { Icon } from "../common";
import { FileReviewStatusBadge } from "../review";
import { getFileIcon } from "../../utils/workspaceDisplay";
import type { FileDiff, FileNode } from "../../types/workspace";
import type { FileReviewStatus } from "../../types/review";

interface ChangesFileListProps {
  changedFiles: FileNode[];
  diffsByFileId: Record<string, FileDiff>;
  onSelectFile: (node: FileNode) => void;
  getReviewStatus?: (fileId: string) => FileReviewStatus;
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  modified: { label: "MODIFIED", className: "text-secondary bg-secondary-container/10" },
  added: { label: "ADDED", className: "text-success-mint bg-success-mint/10" },
  deleted: { label: "DELETED", className: "text-error bg-error-container/20" },
};

export function ChangesFileList({ changedFiles, diffsByFileId, onSelectFile, getReviewStatus }: ChangesFileListProps) {
  return (
    <div className="flex-1 overflow-auto p-lg">
      <div className="max-w-3xl mx-auto flex flex-col gap-sm">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-sm">
          {changedFiles.length} Changed File{changedFiles.length === 1 ? "" : "s"}
        </h2>
        {changedFiles.map((file) => {
          const diff = diffsByFileId[file.id];
          const status = STATUS_STYLES[file.status ?? "modified"];
          const reviewStatus = getReviewStatus?.(file.id);
          return (
            <button
              key={file.id}
              type="button"
              onClick={() => onSelectFile(file)}
              className="flex items-center justify-between gap-md p-md rounded-lg border border-outline-variant bg-surface-container-low hover:border-primary/50 hover:bg-surface-container transition-colors text-left"
            >
              <div className="flex items-center gap-sm min-w-0">
                <Icon name={getFileIcon(file.name)} size={18} className="text-secondary flex-shrink-0" />
                <span className="font-code text-code text-on-surface truncate">{file.name}</span>
                {status && (
                  <span className={`px-2 py-0.5 rounded-full font-label-sm text-[9px] tracking-widest flex-shrink-0 ${status.className}`}>
                    {status.label}
                  </span>
                )}
                {reviewStatus && <FileReviewStatusBadge status={reviewStatus} />}
              </div>
              {diff && (
                <div className="flex items-center gap-sm font-code text-[12px] flex-shrink-0">
                  <span className="text-success-mint">+{diff.additions}</span>
                  <span className="text-error">-{diff.deletions}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
