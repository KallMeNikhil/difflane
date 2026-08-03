import { Avatar, Icon, IconButton } from "../common";
import { useModalDialog } from "../../hooks/useModalDialog";
import { SessionStatusPill } from "./SessionStatusPill";
import { formatDateTimeLabel, formatDurationLabel } from "../../services/SessionHistoryService";
import type { SessionRecord } from "../../types/session";

interface SessionSummaryModalProps {
  record: SessionRecord;
  onClose: () => void;
  onOpenWorkspace: () => void;
  onOpenHistory: () => void;
}

function OverviewField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">{label}</div>
      <div className="font-body-md text-body-md text-on-surface font-medium">{children}</div>
    </div>
  );
}

function MetricCard({ icon, label, value, tone = "text-on-surface-variant" }: { icon: string; label: string; value: number; tone?: string }) {
  return (
    <div className="bg-surface-container border border-outline rounded-xl p-md flex flex-col">
      <div className={`flex items-center gap-2 mb-2 ${tone}`}>
        <Icon name={icon} size={18} />
        <span className="font-label-md text-label-md">{label}</span>
      </div>
      <div className="font-headline-lg text-headline-lg text-on-surface">{value}</div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface-container border border-outline rounded-xl p-lg flex flex-col">
      <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-4 pb-2 border-b border-outline">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function SessionSummaryModal({ record, onClose, onOpenWorkspace, onOpenHistory }: SessionSummaryModalProps) {
  const dialogRef = useModalDialog<HTMLDivElement>(onClose);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-md bg-black/45 backdrop-blur-[10px]">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-summary-title"
        tabIndex={-1}
        className="relative w-full max-w-[860px] bg-surface rounded-xl border border-outline shadow-2xl flex flex-col max-h-[90vh] overflow-hidden outline-none"
      >
        <div className="flex-shrink-0 flex items-start justify-between p-lg border-b border-outline">
          <div>
            <h2 id="session-summary-title" className="font-headline-md text-headline-md text-on-surface">
              Session Summary
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Review the outcomes and collaboration statistics from this session.
            </p>
          </div>
          <IconButton icon="close" aria-label="Close session summary" onClick={onClose} />
        </div>

        <div className="p-lg overflow-y-auto flex flex-col gap-xl">
          <section className="bg-surface-container border border-outline rounded-xl p-md">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-lg gap-x-md">
              <OverviewField label="Workspace Name">{record.workspace.name}</OverviewField>
              <OverviewField label="Review Session">{record.title}</OverviewField>
              <div>
                <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Session Status</div>
                <SessionStatusPill status={record.status} />
              </div>
              <OverviewField label="Started At">{formatDateTimeLabel(record.startedAt)}</OverviewField>
              <OverviewField label="Ended At">{record.endedAt ? formatDateTimeLabel(record.endedAt) : "In progress"}</OverviewField>
              <OverviewField label="Total Duration">{formatDurationLabel(record.startedAt, record.endedAt)}</OverviewField>
              <OverviewField label="Repository Source">
                {record.repository ? `${record.repository.owner}/${record.repository.name}` : "Not connected"}
              </OverviewField>
            </div>
          </section>

          <section className="grid grid-cols-2 md:grid-cols-5 gap-md">
            <MetricCard icon="folder" label="Files Imported" value={record.counts.filesImported} />
            <MetricCard icon="description" label="Files Reviewed" value={record.counts.filesReviewed} />
            <MetricCard icon="forum" label="Discussions Created" value={record.counts.discussionsCreated} />
            <MetricCard icon="task_alt" label="Discussions Resolved" value={record.counts.discussionsResolved} tone="text-success-mint" />
            <MetricCard icon="group" label="Participants" value={record.participants.length} />
          </section>

          <SectionCard title="Workspace Summary">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="flex flex-col">
                <span className="text-label-sm text-on-surface-variant uppercase">File System</span>
                <span className="text-body-sm text-on-surface">{record.fileSystem.type}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-label-sm text-on-surface-variant uppercase">Folders</span>
                <span className="text-body-sm text-on-surface">{record.fileSystem.folderCount}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-label-sm text-on-surface-variant uppercase">Files</span>
                <span className="text-body-sm text-on-surface">{record.fileSystem.fileCount}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-label-sm text-on-surface-variant uppercase">Source</span>
                <span className="text-body-sm text-on-surface">{record.repository ? "Git Repository" : "Not connected"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-label-sm text-on-surface-variant uppercase">Branch</span>
                <span className="text-body-sm text-on-surface">{record.repository?.branch ?? "-"}</span>
              </div>
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
            <SectionCard title="Session Timeline">
              <div className="flex flex-col gap-6 relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-outline" />
                {record.timeline.map((event, index) => {
                  const isLast = index === record.timeline.length - 1;
                  return (
                    <div key={event.id} className="flex gap-4 relative z-10">
                      <div
                        className={`w-6 h-6 rounded-full bg-surface border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          isLast ? "border-success-mint" : "border-outline"
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${isLast ? "bg-success-mint" : "bg-on-surface-variant"}`} />
                      </div>
                      <div>
                        <div className={`font-body-md text-body-md font-medium ${isLast ? "text-success-mint" : "text-on-surface"}`}>
                          {event.description}
                        </div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant">{event.timestampLabel}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <div className="flex flex-col gap-lg">
              <SectionCard title="Session Participants">
                <div className="flex flex-col gap-4">
                  {record.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-3">
                      <Avatar initials={participant.initials} presence={participant.presence === "offline" ? undefined : participant.presence} />
                      <div className="flex-1 min-w-0">
                        <div className="font-body-md text-body-md text-on-surface font-medium truncate">{participant.name}</div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant truncate">{participant.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Session Outcomes">
                <ul className="flex flex-col gap-3">
                  {record.outcomes.map((outcome, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Icon name="check_circle" size={20} className="text-success-mint shrink-0 mt-0.5" />
                      <span className="font-body-md text-body-md text-on-surface">{outcome}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 p-lg border-t border-outline bg-surface flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2">
            <Icon name="info" size={16} />
            Session summaries are automatically saved.
          </div>
          <div className="flex items-center gap-md w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-transparent border border-outline text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-highest transition-colors w-full sm:w-auto text-center"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onOpenHistory}
              className="px-4 py-2 bg-transparent border border-outline text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-highest transition-colors w-full sm:w-auto text-center"
            >
              Open Session History
            </button>
            {record.status !== "archived" && (
              <button
                type="button"
                onClick={onOpenWorkspace}
                className="px-4 py-2 bg-primary-container text-on-primary-container rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity w-full sm:w-auto text-center"
              >
                Open Workspace
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
