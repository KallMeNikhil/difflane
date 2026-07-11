import { buildBreadcrumbPath, flattenFileNodes } from "./FileTreeService";
import { formatRelativeTimeLabel } from "./SessionHistoryService";
import type { FileNode, OpenEditorTab } from "../types/workspace";
import type { SearchFilter, SearchResultCategory, SearchResultItem, SearchSourceCollaborator, SearchSourceRepository } from "../types/search";
import type { SessionRecord } from "../types/session";

export interface SearchSources {
  fileTree?: FileNode[];
  openTabs?: OpenEditorTab[];
  sessions?: SessionRecord[];
  repositories?: SearchSourceRepository[];
  collaborators?: SearchSourceCollaborator[];
}

function fileIcon(node: FileNode): string {
  return node.type === "folder" ? "folder" : "description";
}

export function buildSearchIndex(sources: SearchSources): SearchResultItem[] {
  const items: SearchResultItem[] = [];

  if (sources.fileTree) {
    for (const node of flattenFileNodes(sources.fileTree)) {
      const path = buildBreadcrumbPath(sources.fileTree, node.id);
      items.push({
        id: `file-${node.id}`,
        category: "files",
        icon: fileIcon(node),
        title: node.name,
        subtitle: path ? path.join("/") : node.name,
        badge: "File",
        fileId: node.id,
      });
    }
  }

  if (sources.openTabs) {
    for (const tab of sources.openTabs) {
      items.push({
        id: `tab-${tab.fileId}`,
        category: "openTabs",
        icon: "tab",
        title: tab.name,
        subtitle: tab.path,
        badge: "Tab",
        fileId: tab.fileId,
      });
    }
  }

  if (sources.sessions) {
    for (const session of sources.sessions) {
      items.push({
        id: `session-${session.id}`,
        category: "sessions",
        icon: "history",
        title: session.title,
        subtitle: `${session.workspace.name} • ${formatRelativeTimeLabel(session.lastActivityAt)}`,
        badge: "Session",
        roomCode: session.roomCode,
      });
    }
  }

  if (sources.repositories) {
    for (const repository of sources.repositories) {
      items.push({
        id: `repository-${repository.id}`,
        category: "repositories",
        icon: "source",
        title: repository.name,
        subtitle: repository.detail,
        badge: "Repo",
        roomCode: repository.id,
      });
    }
  }

  if (sources.collaborators) {
    for (const collaborator of sources.collaborators) {
      items.push({
        id: `collaborator-${collaborator.id}`,
        category: "collaborators",
        icon: "person",
        title: collaborator.name,
        subtitle: collaborator.role ?? "Collaborator",
        badge: "Collaborator",
      });
    }
  }

  return items;
}

function matchesQuery(item: SearchResultItem, query: string): boolean {
  if (!query.trim()) {
    return true;
  }
  const haystack = `${item.title} ${item.subtitle}`.toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

export function filterSearchResults(items: SearchResultItem[], query: string, filter: SearchFilter): SearchResultItem[] {
  return items.filter((item) => (filter === "all" || item.category === filter) && matchesQuery(item, query));
}

export function groupSearchResultsByCategory(items: SearchResultItem[]): { category: SearchResultCategory; items: SearchResultItem[] }[] {
  const order: SearchResultCategory[] = ["files", "openTabs", "sessions", "repositories", "collaborators"];
  return order
    .map((category) => ({ category, items: items.filter((item) => item.category === category) }))
    .filter((group) => group.items.length > 0);
}

export function availableFilters(sources: SearchSources): SearchResultCategory[] {
  const available: SearchResultCategory[] = [];
  if (sources.fileTree?.length) available.push("files");
  if (sources.openTabs?.length) available.push("openTabs");
  if (sources.sessions?.length) available.push("sessions");
  if (sources.repositories?.length) available.push("repositories");
  if (sources.collaborators?.length) available.push("collaborators");
  return available;
}
