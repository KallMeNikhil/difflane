import { Router, type Response } from "express";
import { GitHubRequestError } from "../github/githubClient.js";
import {
  getRepositoryBranches,
  getRepositorySummary,
  importRepository,
  isValidGitHubBranch,
  isValidGitHubOwner,
  isValidGitHubRepoName,
  parseRepositoryQuery,
} from "../github/repositoryService.js";
import { resolveIdentity } from "../middleware/resolveIdentity.js";
import { moderateRateLimit } from "../middleware/rateLimit.js";

export const repositoryRouter = Router();

const QUERY_MAX_LENGTH = 200;

function handleGitHubError(error: unknown, res: Response): void {
  if (error instanceof GitHubRequestError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  if (error instanceof Error && error.message.length > 0 && error.message.length < 200) {
    res.status(400).json({ message: error.message });
    return;
  }
  res.status(400).json({ message: "Unable to complete the repository request." });
}

repositoryRouter.get("/api/repository/search", resolveIdentity, moderateRateLimit, async (req, res) => {
  try {
    const query = String(req.query.query ?? "");
    if (!query || query.length > QUERY_MAX_LENGTH) {
      res.status(400).json({ message: "Enter a valid repository in the form owner/repo." });
      return;
    }
    const { owner, repo } = parseRepositoryQuery(query);
    const summary = await getRepositorySummary(owner, repo);
    res.json(summary);
  } catch (error) {
    handleGitHubError(error, res);
  }
});

repositoryRouter.get("/api/repository/:owner/:repo/branches", resolveIdentity, moderateRateLimit, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    if (!isValidGitHubOwner(owner) || !isValidGitHubRepoName(repo)) {
      res.status(400).json({ message: "Invalid repository owner or name." });
      return;
    }
    const branches = await getRepositoryBranches(owner, repo);
    res.json({ branches });
  } catch (error) {
    handleGitHubError(error, res);
  }
});

repositoryRouter.post("/api/repository/import", resolveIdentity, moderateRateLimit, async (req, res) => {
  try {
    const { owner, repo, branch } = req.body as { owner?: string; repo?: string; branch?: string };
    if (!owner || !repo || !branch) {
      res.status(400).json({ message: "owner, repo and branch are required." });
      return;
    }
    if (!isValidGitHubOwner(owner) || !isValidGitHubRepoName(repo) || !isValidGitHubBranch(branch)) {
      res.status(400).json({ message: "Invalid owner, repo, or branch." });
      return;
    }
    const result = await importRepository(owner, repo, branch);
    res.json(result);
  } catch (error) {
    handleGitHubError(error, res);
  }
});
