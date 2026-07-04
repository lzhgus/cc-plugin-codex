// Workspace + Codex-session resolution helpers.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { isRepo, repoRoot } from "./git.mjs";

export function resolveRepo(cwd = process.cwd()) {
  if (!isRepo(cwd)) return null;
  try {
    return repoRoot(cwd);
  } catch (err) {
    return null;
  }
}

export function resolveRepoFromArgs(args = {}, fallbackCwd = process.cwd()) {
  const candidates = [
    args?.repo_path,
    args?.cwd,
    process.env.CC_PLUGIN_REPO_PATH,
    process.env.CC_PLUGIN_REPO_ROOT,
    fallbackCwd,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const repo = resolveRepo(candidate);
    if (repo) return repo;
  }
  return null;
}

// Best-effort resolution of the current Codex session JSONL path. Codex stores
// sessions under ~/.codex/sessions (and archived ones under archived_sessions).
// We do not have a reliable runtime signal for "the current session id", so we
// pick the most recently modified .jsonl under those dirs whose content
// references the current cwd/repo, falling back to the most recent overall.
export function findCodexSession({ source, cwd } = {}) {
  if (source) {
    if (!existsSync(source)) throw new Error(`--source not found: ${source}`);
    return source;
  }
  const home = homedir();
  const dirs = [
    join(home, ".codex", "sessions"),
    join(home, ".codex", "archived_sessions"),
  ];
  const repo = resolveRepo(cwd);
  const candidates = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      if (!entry.endsWith(".jsonl")) continue;
      const full = join(dir, entry);
      try {
        const st = statSync(full);
        candidates.push({ full, mtime: st.mtimeMs });
      } catch { /* ignore */ }
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.mtime - a.mtime);
  if (repo) {
    // Prefer a session that mentions the repo path. Scan at most the first
    // ~256KB of each of the top few candidates.
    for (const c of candidates.slice(0, 8)) {
      if (sessionReferencesPath(c.full, repo)) return c.full;
    }
  }
  return candidates[0].full;
}

function sessionReferencesPath(file, needle) {
  try {
    const buf = readFileSync(file, "utf8");
    return buf.includes(needle);
  } catch {
    return false;
  }
}
