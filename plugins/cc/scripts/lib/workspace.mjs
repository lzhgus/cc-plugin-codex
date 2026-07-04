// Workspace + Codex-session resolution helpers.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { homedir } from "node:os";
import { PLUGIN_ROOT } from "./fs.mjs";
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
  const explicitCandidates = [
    args?.repo_path,
    args?.cwd,
    process.env.CC_PLUGIN_REPO_PATH,
    process.env.CC_PLUGIN_REPO_ROOT,
  ].filter(Boolean);

  for (const candidate of explicitCandidates) {
    const repo = resolveRepo(candidate);
    if (repo) return repo;
  }
  if (!isInsidePath(PLUGIN_ROOT, fallbackCwd)) {
    return resolveRepo(fallbackCwd);
  }
  return null;
}

function isInsidePath(parent, child) {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || (!!rel && !rel.startsWith("..") && !isAbsolute(rel));
}

// Best-effort resolution of the current Codex session JSONL path. Codex stores
// sessions under ~/.codex/sessions (and archived ones under archived_sessions).
// We do not have a reliable runtime signal for "the current session id", so we
// pick the most recently modified .jsonl under those dirs whose content
// references the current cwd/repo, falling back to the most recent overall.
export function findCodexSession({ source, cwd, sessionDirs } = {}) {
  if (source) {
    if (!existsSync(source)) throw new Error(`--source not found: ${source}`);
    return source;
  }
  const home = homedir();
  const dirs = sessionDirs || [
    join(home, ".codex", "sessions"),
    join(home, ".codex", "archived_sessions"),
  ];
  const repo = resolveRepo(cwd);
  const candidates = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const full of findJsonlFiles(dir)) {
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

function findJsonlFiles(dir, depth = 4) {
  if (depth < 0) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...findJsonlFiles(full, depth - 1));
    } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      out.push(full);
    }
  }
  return out;
}

function sessionReferencesPath(file, needle) {
  try {
    const buf = readFileSync(file, "utf8");
    return buf.includes(needle);
  } catch {
    return false;
  }
}
