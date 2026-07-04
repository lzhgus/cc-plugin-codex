// Process spawning helpers for the cc companion.
import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, existsSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";
import { ensureDir } from "./fs.mjs";

// Run a command in the foreground and collect stdout/stderr. Returns
// { code, stdout, stderr, timedOut }.
export function runForeground({ cmd, args, cwd, env, timeoutMs, input }) {
  const res = spawnSync(cmd, args || [], {
    cwd,
    env: { ...process.env, ...(env || {}) },
    encoding: "utf8",
    timeout: timeoutMs || 0,
    input: input || undefined,
    maxBuffer: 64 * 1024 * 1024,
  });
  return {
    code: res.status,
    stdout: res.stdout || "",
    stderr: res.stderr || "",
    timedOut: res.signal === "SIGTERM" || res.signal === "SIGKILL",
    signal: res.signal,
  };
}

// Spawn a detached child whose combined stdout/stderr is appended to logPath.
// Returns { pid, child, logStream }. The caller must keep the logStream open
// for the lifetime of the child (or call child.unref() and close later).
export function spawnDetached({ cmd, args, cwd, env, logPath }) {
  ensureDir(dirname(logPath));
  const logStream = createWriteStream(logPath, { flags: "a" });
  const child = spawn(cmd, args || [], {
    cwd,
    env: { ...process.env, ...(env || {}) },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  child.stdout.on("data", (d) => logStream.write(d));
  child.stderr.on("data", (d) => logStream.write(d));
  child.on("exit", () => { try { logStream.end(); } catch { /* ignore */ } });
  child.unref();
  return { pid: child.pid, child, logStream };
}

export function killPid(pid, signal = "SIGTERM") {
  try {
    process.kill(pid, signal);
    return true;
  } catch (err) {
    return false;
  }
}

export function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return false;
  }
}

// Wait briefly for a pid to exit. Returns true if it exited.
//
// This is async on purpose: we must let the event loop run between polls so
// the parent process can reap the (detached) child. A blocking sleep would
// keep the zombie un-reaped, so `kill(pid, 0)` would keep reporting "alive"
// even after the child is dead.
export async function waitForExit(pid, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!isAlive(pid)) return true;
    await sleep(100);
  }
  return false;
}

// Robustly terminate a detached child. Sends SIGTERM, re-sending once after a
// short grace window (the first signal can be lost if sent before the child
// has finished exec'ing), then escalates to SIGKILL. Returns true if the pid
// exited. `graceMs` is how long to wait after SIGTERM before escalating.
//
// Async for the same reason as waitForExit: the event loop must run so the
// parent can reap the child.
export async function terminatePid(pid, { graceMs = 800, killTimeoutMs = 3000 } = {}) {
  if (!isAlive(pid)) return true;
  killPid(pid, "SIGTERM");
  const reTermAt = Date.now() + Math.max(50, Math.floor(graceMs / 2));
  const killAt = Date.now() + graceMs;
  const deadline = Date.now() + graceMs + killTimeoutMs;
  let reSent = false;
  while (Date.now() < deadline) {
    if (!isAlive(pid)) return true;
    if (!reSent && Date.now() >= reTermAt) { killPid(pid, "SIGTERM"); reSent = true; }
    if (Date.now() >= killAt) { killPid(pid, "SIGKILL"); break; }
    await sleep(50);
  }
  // Final wait after SIGKILL so the parent can reap.
  return waitForExit(pid, 1500);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}