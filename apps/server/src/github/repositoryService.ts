import { randomUUID } from "node:crypto";
import {
  detectDominantLanguage,
  detectLanguageForPath,
  IMPORT_LIMITS,
  isBinaryPath,
  type RepositoryImportResult,
  type RepositorySummary,
  type WorkspaceFileSystemEntry,
} from "@difflane/shared-types";
import { fetchBranches, fetchFileContent, fetchRepository, fetchTree, type GitHubTreeEntry } from "./githubClient.js";

const CONTENT_FETCH_CONCURRENCY = 8;
const GITHUB_OWNER_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
const GITHUB_REPO_PATTERN = /^[a-zA-Z0-9._-]{1,100}$/;
const GITHUB_BRANCH_PATTERN = /^[^\s~^:?*[\\]{1,255}$/;

export function isValidGitHubOwner(value: string): boolean {
  return GITHUB_OWNER_PATTERN.test(value);
}

export function isValidGitHubRepoName(value: string): boolean {
  return GITHUB_REPO_PATTERN.test(value) && value !== "." && value !== "..";
}

export function isValidGitHubBranch(value: string): boolean {
  return GITHUB_BRANCH_PATTERN.test(value) && !value.startsWith("/") && !value.endsWith("/") && !value.includes("..");
}

export function parseRepositoryQuery(query: string): { owner: string; repo: string } {
  const trimmed = query.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "");
  const segments = trimmed.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw new Error("Enter a repository in the form owner/repo.");
  }
  const [owner, repo] = segments;
  if (!isValidGitHubOwner(owner) || !isValidGitHubRepoName(repo)) {
    throw new Error("Enter a valid repository in the form owner/repo.");
  }
  return { owner, repo };
}

export async function getRepositorySummary(owner: string, repo: string): Promise<RepositorySummary> {
  const repository = await fetchRepository(owner, repo);
  return {
    owner: repository.owner.login,
    name: repository.name,
    fullName: repository.full_name,
    defaultBranch: repository.default_branch,
    updatedAt: repository.updated_at,
    fileCount: 0,
    isPrivate: repository.private,
  };
}

export async function getRepositoryBranches(owner: string, repo: string): Promise<string[]> {
  const branches = await fetchBranches(owner, repo);
  return branches.map((branch) => branch.name);
}

function buildEntries(treeItems: GitHubTreeEntry[]): {
  entries: WorkspaceFileSystemEntry[];
  fileEntriesByPath: Map<string, WorkspaceFileSystemEntry>;
} {
  const importable = treeItems.filter((item) => item.type === "blob" || item.type === "tree");
  const sorted = [...importable].sort((a, b) => a.path.split("/").length - b.path.split("/").length);

  const idByPath = new Map<string, string>();
  const entries: WorkspaceFileSystemEntry[] = [];
  const fileEntriesByPath = new Map<string, WorkspaceFileSystemEntry>();
  const orderByParent = new Map<string, number>();

  for (const item of sorted) {
    const segments = item.path.split("/");
    const name = segments[segments.length - 1];
    const parentPath = segments.slice(0, -1).join("/");
    const parentId = parentPath ? idByPath.get(parentPath) ?? null : null;
    const id = randomUUID();
    idByPath.set(item.path, id);

    const order = orderByParent.get(parentId ?? "root") ?? 0;
    orderByParent.set(parentId ?? "root", order + 1);

    const entry: WorkspaceFileSystemEntry = {
      id,
      parentId,
      name,
      type: item.type === "tree" ? "folder" : "file",
      order,
      ...(item.type === "blob" ? { language: detectLanguageForPath(name) } : {}),
    };
    entries.push(entry);
    if (item.type === "blob") {
      fileEntriesByPath.set(item.path, entry);
    }
  }

  return { entries, fileEntriesByPath };
}

async function fetchContentsWithConcurrency(
  owner: string,
  repo: string,
  branch: string,
  paths: string[],
): Promise<Map<string, string>> {
  const contents = new Map<string, string>();
  let cursor = 0;

  async function worker() {
    while (cursor < paths.length) {
      const index = cursor;
      cursor += 1;
      const path = paths[index];
      try {
        const content = await fetchFileContent(owner, repo, branch, path);
        contents.set(path, content);
      } catch {
        contents.set(path, "");
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONTENT_FETCH_CONCURRENCY, paths.length) }, () => worker());
  await Promise.all(workers);
  return contents;
}

export async function importRepository(owner: string, repo: string, branch: string): Promise<RepositoryImportResult> {
  const [repository, tree] = await Promise.all([fetchRepository(owner, repo), fetchTree(owner, repo, branch)]);

  const { entries, fileEntriesByPath } = buildEntries(tree.tree);

  const importablePaths = tree.tree
    .filter((item) => item.type === "blob")
    .filter((item) => !isBinaryPath(item.path))
    .filter((item) => (item.size ?? 0) <= IMPORT_LIMITS.maxFileSizeBytes)
    .slice(0, IMPORT_LIMITS.maxFiles)
    .map((item) => item.path);

  const contentsByPath = await fetchContentsWithConcurrency(owner, repo, branch, importablePaths);

  const files: Record<string, string> = {};
  for (const [path, content] of contentsByPath) {
    const entry = fileEntriesByPath.get(path);
    if (entry) {
      files[entry.id] = content;
    }
  }

  const detectedLanguage = detectDominantLanguage(importablePaths);
  const fileCount = entries.filter((entry) => entry.type === "file").length;

  return {
    repository: {
      owner: repository.owner.login,
      name: repository.name,
      fullName: repository.full_name,
      defaultBranch: repository.default_branch,
      updatedAt: repository.updated_at,
      fileCount,
      isPrivate: repository.private,
    },
    branch,
    entries,
    files,
    fileCount,
    detectedLanguage,
  };
}
