const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com";

export class GitHubRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "GitHubRequestError";
  }
}

interface GitHubRepositoryResponse {
  name: string;
  full_name: string;
  owner: { login: string };
  default_branch: string;
  updated_at: string;
  private: boolean;
}

export interface GitHubBranchResponse {
  name: string;
}

export interface GitHubTreeEntry {
  path: string;
  type: "blob" | "tree" | "commit";
  size?: number;
}

interface GitHubTreeResponse {
  tree: GitHubTreeEntry[];
  truncated: boolean;
}

async function githubFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (response.status === 404) {
    throw new GitHubRequestError("Repository or resource not found.", 404);
  }
  if (response.status === 403) {
    throw new GitHubRequestError("GitHub API rate limit exceeded. Please try again later.", 403);
  }
  if (!response.ok) {
    throw new GitHubRequestError(`GitHub API request failed with status ${response.status}.`, response.status);
  }

  return (await response.json()) as T;
}

export async function fetchRepository(owner: string, repo: string): Promise<GitHubRepositoryResponse> {
  return githubFetch<GitHubRepositoryResponse>(`/repos/${owner}/${repo}`);
}

export async function fetchBranches(owner: string, repo: string): Promise<GitHubBranchResponse[]> {
  return githubFetch<GitHubBranchResponse[]>(`/repos/${owner}/${repo}/branches?per_page=100`);
}

export async function fetchTree(owner: string, repo: string, branch: string): Promise<GitHubTreeResponse> {
  return githubFetch<GitHubTreeResponse>(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
}

export async function fetchFileContent(owner: string, repo: string, branch: string, path: string): Promise<string> {
  const response = await fetch(`${GITHUB_RAW_BASE}/${owner}/${repo}/${encodeURIComponent(branch)}/${path}`);
  if (!response.ok) {
    throw new GitHubRequestError(`Unable to fetch file content for ${path}.`, response.status);
  }
  return response.text();
}

export type { GitHubRepositoryResponse };
