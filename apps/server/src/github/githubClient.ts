const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com";
const GITHUB_FETCH_TIMEOUT_MS = 15000;

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
  let response: Response;
  try {
    response = await fetch(`${GITHUB_API_BASE}${path}`, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(GITHUB_FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new GitHubRequestError("The request to GitHub timed out. Please try again.", 504);
    }
    throw new GitHubRequestError("Unable to reach GitHub. Please try again.", 502);
  }

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
  return githubFetch<GitHubRepositoryResponse>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
}

export async function fetchBranches(owner: string, repo: string): Promise<GitHubBranchResponse[]> {
  return githubFetch<GitHubBranchResponse[]>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100`);
}

export async function fetchTree(owner: string, repo: string, branch: string): Promise<GitHubTreeResponse> {
  return githubFetch<GitHubTreeResponse>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  );
}

export async function fetchFileContent(owner: string, repo: string, branch: string, path: string): Promise<string> {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  let response: Response;
  try {
    response = await fetch(
      `${GITHUB_RAW_BASE}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${encodedPath}`,
      { signal: AbortSignal.timeout(GITHUB_FETCH_TIMEOUT_MS) },
    );
  } catch {
    throw new GitHubRequestError(`Unable to fetch file content for ${path}.`, 502);
  }
  if (!response.ok) {
    throw new GitHubRequestError(`Unable to fetch file content for ${path}.`, response.status);
  }
  return response.text();
}

export type { GitHubRepositoryResponse };
