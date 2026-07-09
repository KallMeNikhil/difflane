import { Router, type Response } from "express";
import { GitHubRequestError } from "../github/githubClient.js";
import { getRepositoryBranches, getRepositorySummary, importRepository, parseRepositoryQuery } from "../github/repositoryService.js";

export const repositoryRouter = Router();

function handleGitHubError(error: unknown, res: Response): void {
  if (error instanceof GitHubRequestError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  const message = error instanceof Error ? error.message : "Unable to complete the repository request.";
  res.status(400).json({ message });
}

repositoryRouter.get("/api/repository/search", async (req, res) => {
  try {
    const query = String(req.query.query ?? "");
    const { owner, repo } = parseRepositoryQuery(query);
    const summary = await getRepositorySummary(owner, repo);
    res.json(summary);
  } catch (error) {
    handleGitHubError(error, res);
  }
});

repositoryRouter.get("/api/repository/:owner/:repo/branches", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const branches = await getRepositoryBranches(owner, repo);
    res.json({ branches });
  } catch (error) {
    handleGitHubError(error, res);
  }
});

repositoryRouter.post("/api/repository/import", async (req, res) => {
  try {
    const { owner, repo, branch } = req.body as { owner?: string; repo?: string; branch?: string };
    if (!owner || !repo || !branch) {
      res.status(400).json({ message: "owner, repo and branch are required." });
      return;
    }
    const result = await importRepository(owner, repo, branch);
    res.json(result);
  } catch (error) {
    handleGitHubError(error, res);
  }
});
