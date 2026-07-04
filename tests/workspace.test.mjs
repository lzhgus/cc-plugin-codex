import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { PLUGIN_ROOT } from "../plugins/cc/scripts/lib/fs.mjs";
import { findCodexSession, resolveRepoFromArgs } from "../plugins/cc/scripts/lib/workspace.mjs";

function sh(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, encoding: "utf8" });
}

function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), "cc-workspace-"));
  sh("git", ["init", "-q", "-b", "main"], dir);
  sh("git", ["config", "user.email", "t@t.t"], dir);
  sh("git", ["config", "user.name", "Test"], dir);
  writeFileSync(join(dir, "a.txt"), "hello\n");
  sh("git", ["add", "."], dir);
  sh("git", ["commit", "-q", "-m", "init"], dir);
  return dir;
}

function gitRoot(cwd) {
  return sh("git", ["rev-parse", "--show-toplevel"], cwd).trim();
}

test("resolveRepoFromArgs ignores plugin-root fallback cwd", () => {
  assert.equal(resolveRepoFromArgs({}, PLUGIN_ROOT), null);
});

test("resolveRepoFromArgs accepts explicit repo_path even when fallback cwd is plugin root", () => {
  const repo = makeRepo();
  try {
    assert.equal(resolveRepoFromArgs({ repo_path: repo }, PLUGIN_ROOT), gitRoot(repo));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("findCodexSession searches nested session directories for the repo path", () => {
  const repo = makeRepo();
  const sessions = mkdtempSync(join(tmpdir(), "cc-sessions-"));
  const nested = join(sessions, "2026", "07");
  const session = join(nested, "rollout-test.jsonl");
  try {
    mkdirSync(nested, { recursive: true });
    writeFileSync(session, JSON.stringify({ role: "user", content: `work in ${repo}` }) + "\n");
    assert.equal(findCodexSession({ cwd: repo, sessionDirs: [sessions] }), session);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(sessions, { recursive: true, force: true });
  }
});
