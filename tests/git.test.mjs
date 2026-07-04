import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { isRepo, repoRoot, resolveDiff, hasChanges, currentBranch } from "../plugins/cc/scripts/lib/git.mjs";

function sh(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, encoding: "utf8" });
}

function makeRepo() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "cc-git-")));
  sh("git", ["init", "-q", "-b", "main"], dir);
  sh("git", ["config", "user.email", "t@t.t"], dir);
  sh("git", ["config", "user.name", "Test"], dir);
  writeFileSync(join(dir, "a.txt"), "hello\n");
  sh("git", ["add", "."], dir);
  sh("git", ["commit", "-q", "-m", "init"], dir);
  return dir;
}

test("isRepo and repoRoot", () => {
  const dir = makeRepo();
  assert.equal(isRepo(dir), true);
  assert.equal(isRepo(mkdtempSync(join(tmpdir(), "nongit-"))), false);
  assert.equal(repoRoot(dir), dir);
});

test("resolveDiff sees uncommitted changes vs HEAD", () => {
  const dir = makeRepo();
  writeFileSync(join(dir, "a.txt"), "hello world\n");
  sh("git", ["add", "."], dir);
  const { diff, stat, files } = resolveDiff(dir, null);
  assert.ok(diff.length > 0);
  assert.ok(files.includes("a.txt"));
});

test("resolveDiff with base ref returns branch diff", () => {
  const dir = makeRepo();
  sh("git", ["checkout", "-q", "-b", "feature"], dir);
  writeFileSync(join(dir, "b.txt"), "new\n");
  sh("git", ["add", "."], dir);
  sh("git", ["commit", "-q", "-m", "feat"], dir);
  const { diff, files, base, mergeBase } = resolveDiff(dir, "main");
  assert.ok(files.includes("b.txt"));
  assert.equal(base, "main");
  assert.ok(diff.includes("new"));
});

test("resolveDiff throws on bad base", () => {
  const dir = makeRepo();
  assert.throws(() => resolveDiff(dir, "nope-not-a-ref"), /does not exist/);
});

test("hasChanges", () => {
  const dir = makeRepo();
  assert.equal(hasChanges(dir, null), false);
  writeFileSync(join(dir, "c.txt"), "x\n");
  sh("git", ["add", "."], dir);
  assert.equal(hasChanges(dir, null), true);
});

test("currentBranch", () => {
  const dir = makeRepo();
  assert.equal(currentBranch(dir), "main");
});