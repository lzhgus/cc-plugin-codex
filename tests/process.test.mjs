import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "./helpers.mjs";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runForeground, spawnDetached, isAlive, killPid, waitForExit, terminatePid } from "../plugins/cc/scripts/lib/process.mjs";

test("runForeground captures stdout", () => {
  const res = runForeground({ cmd: "node", args: ["-e", "console.log('hi')"] });
  assert.equal(res.code, 0);
  assert.equal(res.stdout.trim(), "hi");
});

test("runForeground non-zero code", () => {
  const res = runForeground({ cmd: "node", args: ["-e", "process.exit(3)"] });
  assert.equal(res.code, 3);
});

test("runForeground timeout", () => {
  const res = runForeground({ cmd: "node", args: ["-e", "setTimeout(()=>{}, 5000)"], timeoutMs: 200 });
  assert.equal(res.timedOut, true);
});

test("spawnDetached writes stdout to logPath", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cc-proc-"));
  const logPath = join(dir, "out.log");
  const { pid } = spawnDetached({
    cmd: "node",
    args: ["-e", "console.log('detached'); console.error('err line')"],
    logPath,
  });
  // Wait for the process to exit and flush.
  await new Promise((r) => setTimeout(r, 300));
  const exited = await waitForExit(pid, 2000);
  assert.equal(exited, true);
  const log = readFileSync(logPath, "utf8");
  assert.match(log, /detached/);
  assert.match(log, /err line/);
  rmSync(dir, { recursive: true, force: true });
});

test("isAlive/killPid/waitForExit on a long-running child", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cc-proc-"));
  const logPath = join(dir, "long.log");
  const { pid } = spawnDetached({
    cmd: "node",
    args: ["-e", "setInterval(()=>{}, 60000)"],
    logPath,
  });
  assert.equal(isAlive(pid), true);
  // Use terminatePid: it re-sends SIGTERM (the first can be lost if sent
  // before the child has finished exec'ing) and escalates to SIGKILL.
  const exited = await terminatePid(pid, { graceMs: 800, killTimeoutMs: 3000 });
  assert.equal(exited, true);
  assert.equal(isAlive(pid), false);
  rmSync(dir, { recursive: true, force: true });
});