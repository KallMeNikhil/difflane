import type { CodeToken, DiffLine } from "../../types/workspace";

interface DiffHunkCardProps {
  lines: DiffLine[];
  lineNumberSide: "old" | "new" | "auto";
}

const TOKEN_CLASSES: Record<CodeToken["kind"], string> = {
  plain: "",
  keyword: "text-primary",
  identifier: "text-secondary",
  parameter: "text-tertiary",
  string: "text-green-400",
  comment: "text-on-surface-variant italic opacity-70",
  highlight: "bg-primary-container/20 rounded px-0.5",
};

const LINE_STYLES: Record<DiffLine["kind"], string> = {
  context: "text-on-surface",
  removed: "text-on-surface bg-error-container/20 border-l-4 border-error -ml-1",
  added: "text-on-surface bg-green-500/10 border-l-4 border-green-500 -ml-1",
  meta: "text-on-surface-variant",
};

export function DiffHunkCard({ lines, lineNumberSide }: DiffHunkCardProps) {
  const hasRemoved = lines.some((line) => line.kind === "removed");
  const hasAdded = lines.some((line) => line.kind === "added");
  const borderClass = hasRemoved ? "border-outline-variant" : hasAdded ? "border-green-500/30" : "border-outline-variant";

  return (
    <div className={`rounded-lg border ${borderClass} bg-surface-container-highest overflow-hidden shadow-sm`}>
      <div className="flex">
        <div className="w-12 bg-surface-container border-r border-outline-variant flex flex-col items-end py-sm pr-2 text-on-surface-variant opacity-60 select-none flex-shrink-0">
          {lines.map((line) => {
            const number = lineNumberSide === "old" ? line.oldLineNumber : lineNumberSide === "new" ? line.newLineNumber : line.oldLineNumber ?? line.newLineNumber;
            return <div key={line.id}>{number ?? "\u00A0"}</div>;
          })}
        </div>
        <div className="flex-1 py-sm overflow-x-auto whitespace-pre">
          {lines.map((line) => (
            <div key={line.id} className={`px-md relative group ${LINE_STYLES[line.kind]}`}>
              {line.kind === "removed" && <span className="absolute left-2 text-error font-bold opacity-50">-</span>}
              {line.kind === "added" && <span className="absolute left-2 text-green-500 font-bold opacity-50">+</span>}
              {line.kind !== "context" && <span className="inline-block w-3" />}
              {line.tokens.map((token, index) => (
                <span key={index} className={TOKEN_CLASSES[token.kind]}>
                  {token.text}
                </span>
              ))}
              {line.typingIndicator && (
                <span className="inline-flex flex-col items-center align-middle ml-2 animate-pulse">
                  <span className="bg-primary-container text-white font-label-sm text-[9px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap mb-1">
                    {line.typingIndicator}
                  </span>
                  <span className="w-[2px] h-4 bg-primary-container" />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
