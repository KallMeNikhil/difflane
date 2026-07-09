import { Icon } from "../common";

export interface PendingCreate {
  parentId: string | null;
  type: "file" | "folder";
}

export function PendingCreateRow({
  type,
  onCommit,
  onCancel,
}: {
  type: "file" | "folder";
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  return (
    <li className="mb-0.5">
      <div className="flex items-center gap-xs px-sm py-1">
        <span className="w-4" />
        <Icon name={type === "folder" ? "folder" : "insert_drive_file"} size={16} className="text-[#A7AFBF]" />
        <input
          autoFocus
          type="text"
          placeholder={type === "folder" ? "folder-name" : "file-name.ts"}
          className="flex-1 bg-[#1A1F27] text-[#F3F4F6] border border-[#4F6EF7] rounded px-1 py-0.5 text-[12px] focus:outline-none"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onCommit(event.currentTarget.value);
            } else if (event.key === "Escape") {
              onCancel();
            }
          }}
          onBlur={(event) => onCommit(event.currentTarget.value)}
        />
      </div>
    </li>
  );
}
