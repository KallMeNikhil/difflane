import type { FileNode } from "../types/workspace";

export const MOCK_REPOSITORY_TREE: FileNode[] = [
  {
    id: "folder-src",
    name: "src",
    type: "folder",
    isExpanded: true,
    children: [
      {
        id: "folder-assets",
        name: "assets",
        type: "folder",
        isExpanded: false,
        children: [
          { id: "file-logo-svg", name: "logo.svg", type: "file", language: "plaintext", status: "unmodified" },
        ],
      },
      {
        id: "folder-components",
        name: "components",
        type: "folder",
        isExpanded: true,
        children: [
          { id: "file-header", name: "Header.tsx", type: "file", language: "typescript", status: "unmodified" },
          { id: "file-main-editor", name: "MainEditor.tsx", type: "file", language: "typescript", status: "modified" },
          { id: "file-sidebar", name: "Sidebar.tsx", type: "file", language: "typescript", status: "added" },
        ],
      },
      {
        id: "folder-services",
        name: "services",
        type: "folder",
        isExpanded: false,
        children: [
          { id: "file-legacy-api", name: "api.ts", type: "file", language: "typescript", status: "deleted" },
        ],
      },
      { id: "file-app", name: "App.tsx", type: "file", language: "typescript", status: "unmodified" },
    ],
  },
];

export const MOCK_PROJECT_NAME = "Project-Alpha";
export const MOCK_BRANCH_NAME = "main";

export const DEFAULT_ACTIVE_FILE_ID = "file-main-editor";
