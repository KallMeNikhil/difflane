export type SearchResultCategory = "files" | "openTabs" | "sessions" | "repositories" | "collaborators";

export type SearchFilter = "all" | SearchResultCategory;

export interface SearchResultItem {
  id: string;
  category: SearchResultCategory;
  icon: string;
  title: string;
  subtitle: string;
  badge: string;
  roomCode?: string;
  fileId?: string;
}

export interface SearchSourceCollaborator {
  id: string;
  name: string;
  role?: string;
}

export interface SearchSourceRepository {
  id: string;
  name: string;
  detail: string;
}

export const SEARCH_FILTERS: { id: SearchFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "files", label: "Files" },
  { id: "openTabs", label: "Open Tabs" },
  { id: "sessions", label: "Session History" },
  { id: "repositories", label: "Repositories" },
  { id: "collaborators", label: "Collaborators" },
];

export const SEARCH_CATEGORY_LABEL: Record<SearchResultCategory, string> = {
  files: "Files",
  openTabs: "Open Tabs",
  sessions: "Session History",
  repositories: "Repositories",
  collaborators: "Collaborators",
};
