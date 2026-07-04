// Git helpers for resolving review targets.
import { runForeground } from "./process.mjs";

function git(cwd, args) {
  const res = runForeground({ cmd: "git", args, cwd, timeoutMs: 15_000 });
  if (res.code !== 0) {
    const err = new Error(`git ${args.join(" ")} failed: ${(res.stderr || res.stdout || "").trim()}`);
    err.code = res.code;
    err.stderr = res.stderr;
    throw err;
  }
  return res.stdout;
}

export function isRepo(cwd) {
  try {
    const res = runForeground({ cmd: "git", args: ["rev-parse", "--is-inside-work-tree"], cwd, timeoutMs: 5_000 });
    return res.code === 0 && (res.stdout || "").trim() === "true";
  } catch (err) {
    return false;
  }
}

export function repoRoot(cwd) {
  return git(cwd, ["rev-parse", "--show-toplevel"]).trim();
}

export function currentBranch(cwd) {
  return git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
}

export function refExists(cwd, ref) {
  const res = runForeground({ cmd: "git", args: ["rev-parse", "--verify", `${ref}^{commit}`], cwd, timeoutMs: 5_000 });
  return res.code === 0;
}

// Resolve the diff for review. If `base` is given, returns the branch diff
// (three-dot, changes on this branch since the merge base with `base`);
// otherwise returns uncommitted changes vs HEAD (staged + unstaged).
export function resolveDiff(cwd, base) {
  if (base) {
    if (!refExists(cwd, base)) {
      throw new Error(`base ref "${base}" does not exist`);
    }
    const mergeBase = git(cwd, ["merge-base", base, "HEAD"]).trim();
    const diff = git(cwd, ["diff", `${mergeBase}...HEAD`]);
    const stat = git(cwd, ["diff", "--stat", `${mergeBase}...HEAD`]);
    const names = git(cwd, ["diff", "--name-only", `${mergeBase}...HEAD`]).trim().split("\n").filter(Boolean);
    return { diff, stat, files: names, base, mergeBase };
  }
  const diff = git(cwd, ["diff", "HEAD"]);
  const stat = git(cwd, ["diff", "--stat", "HEAD"]);
  const names = git(cwd, ["diff", "--name-only", "HEAD"]).trim().split("\n").filter(Boolean);
  return { diff, stat, files: names, base: null, mergeBase: "HEAD" };
}

export function hasChanges(cwd, base) {
  const { files } = resolveDiff(cwd, base);
  return files.length > 0;
}

export function recentCommitLog(cwd, base, limit = 20) {
  const range = base ? `${base}..HEAD` : "HEAD";
  return git(cwd, ["log", "--oneline", `-n`, String(limit), range]);
}