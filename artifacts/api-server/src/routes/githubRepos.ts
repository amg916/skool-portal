import { Router, type IRouter } from "express";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/admin/github-repos", requireAuth, requireAdmin, async (_req, res) => {
  const token = process.env["GITHUB_ADMIN_TOKEN"];
  if (!token) {
    res.status(503).json({ error: "GITHUB_ADMIN_TOKEN not configured on the server." });
    return;
  }
  try {
    const r = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=updated&visibility=all&affiliation=owner,collaborator",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "baingers-portal",
        },
      },
    );
    if (!r.ok) {
      const text = await r.text();
      res.status(r.status).json({ error: `GitHub error: ${text.slice(0, 200)}` });
      return;
    }
    const data: any[] = await r.json();
    res.json(
      data.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        isPrivate: repo.private,
        url: repo.html_url,
        defaultBranch: repo.default_branch,
        language: repo.language,
        stargazers: repo.stargazers_count,
        forks: repo.forks_count,
        updatedAt: repo.updated_at,
        pushedAt: repo.pushed_at,
      })),
    );
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "GitHub fetch failed" });
  }
});

export default router;
