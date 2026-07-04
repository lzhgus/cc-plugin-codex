import { test } from "node:test";
import assert from "node:assert/strict";
import { withTempDataDir, withTempDataDirAsync } from "./helpers.mjs";
import {
  newTaskId,
  loadJobs,
  upsertJob,
  getJob,
  removeJob,
  listJobsForRepo,
  latestRescueForRepo,
  createJob,
} from "../plugins/cc/scripts/lib/state.mjs";

test("newTaskId is unique-ish with prefix", () => {
  const a = newTaskId();
  const b = newTaskId();
  assert.match(a, /^cc-/);
  assert.notEqual(a, b);
});

test("upsert + get round-trips a job", () => {
  withTempDataDir(() => {
    const id = newTaskId();
    const job = createJob({ id, kind: "rescue", repoRoot: "/tmp/repo", pid: 12345, logPath: "/tmp/x.log" });
    upsertJob(job);
    assert.deepEqual(getJob(id).id, id);
    assert.equal(getJob(id).status, "running");
    assert.equal(getJob(id).repoRoot, "/tmp/repo");
  });
});

test("upsert merges existing job", () => {
  withTempDataDir(() => {
    const id = newTaskId();
    upsertJob(createJob({ id, kind: "review", repoRoot: "/tmp/r", logPath: "/tmp/l.log" }));
    upsertJob({ id, status: "completed", claudeSessionId: "sess-9" });
    const j = getJob(id);
    assert.equal(j.status, "completed");
    assert.equal(j.claudeSessionId, "sess-9");
    assert.equal(j.repoRoot, "/tmp/r"); // preserved
  });
});

test("listJobsForRepo sorts newest first and latestRescueForRepo picks rescue", async () => {
  await withTempDataDirAsync(async (sleep) => {
    const repo = "/tmp/repo2";
    const a = newTaskId();
    const b = newTaskId();
    upsertJob(createJob({ id: a, kind: "review", repoRoot: repo, logPath: "/tmp/a.log" }));
    await sleep(5);
    upsertJob({ id: b, kind: "rescue", repoRoot: repo, status: "completed", claudeSessionId: "s-b" });
    const listed = listJobsForRepo(repo);
    assert.equal(listed.length, 2);
    assert.equal(listed[0].id, b); // most recently updated
    const latest = latestRescueForRepo(repo);
    assert.equal(latest.id, b);
    assert.equal(latestRescueForRepo("/tmp/other"), null);
  });
});

test("removeJob deletes", () => {
  withTempDataDir(() => {
    const id = newTaskId();
    upsertJob(createJob({ id, kind: "rescue", repoRoot: "/tmp/r3" }));
    removeJob(id);
    assert.equal(getJob(id), null);
  });
});