import { execFileSync } from "node:child_process";

export async function collectGit({ window }) {
  const email = execGit(["config", "user.email"]);
  if (!email) return { source: "git", status: "unavailable", repos_detected: 0 };

  const since = window.start.toISOString();
  const until = window.end.toISOString();
  const commitsRaw = execGit([
    "log",
    `--author=${email}`,
    `--since=${since}`,
    `--until=${until}`,
    "--pretty=%H%x1f%s%x1f%(trailers:key=Co-authored-by,valueonly)"
  ]);
  const commits = commitsRaw ? commitsRaw.split("\n").filter(Boolean) : [];
  let aiAssisted = 0;
  for (const line of commits) {
    if (/claude|anthropic|copilot|cursor|codex|openai|aider|codeium|windsurf/i.test(line)) aiAssisted += 1;
  }

  return {
    source: "git",
    status: "ready",
    repos_detected: 1,
    commits_in_window: commits.length,
    ai_assisted_commits: aiAssisted,
    capabilities: {
      content_classification: false,
      validation_detection: false,
      token_usage: false,
      project_context: true
    }
  };
}

function execGit(args) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      timeout: 5000,
      maxBuffer: 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}
