// Background-job state persistence.
//
// Jobs are stored in a single JSON file (`jobs.json`) under the plugin data
// dir. Writes are guarded by a simple flock-style lock file with retry, so
// concurrent MCP tool calls (status/result/cancel) do not clobber each other.
import { existsSync, mkdirSync, openSync, closeSync, unlinkSync, writeFileSync, readFileSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { ensureDataDir, jobsFile } from "./fs.mjs";

const LOCK_TIMEOUT_MS = 3000;
const LOCK_POLL_MS = 25;

function lockFile() {
  return join(ensureDataDir(), "jobs.json.lock");
}

// Acquire an exclusive lock by creating the lock file with O_EXCL. Retries
// until timeout. Returns a release function.
function acquireLock() {
  const lf = lockFile();
  const start = Date.now();
  for (;;) {
    try {
      const fd = openSync(lf, "wx"); // O_EXCL
      closeSync(fd);
      return () => {
        try { unlinkSync(lf); } catch { /* ignore */ }
      };
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
    }
    if (Date.now() - start > LOCK_TIMEOUT_MS) {
      // Stale lock fallback: best-effort remove and retry once.
      try { unlinkSync(lf); } catch { /* ignore */ }
      // Retry one more cycle.
      try {
        const fd = openSync(lf, "wx");
        closeSync(fd);
        return () => { try { unlinkSync(lf); } catch { /* ignore */ } };
      } catch (err) {
        if (err.code !== "EEXIST") throw err;
        throw new Error("jobs.json lock is busy; try again");
      }
    }
    // Sleep briefly using a synchronous wait. Atomics.wait on a shared buffer
    // is the zero-dependency way to sleep in ESM without timers.
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, LOCK_POLL_MS);
  }
}

function readAll() {
  const file = jobsFile();
  try {
    const txt = readFileSync(file, "utf8");
    const data = JSON.parse(txt);
    if (data && typeof data === "object" && Array.isArray(data.jobs)) return data.jobs;
    return [];
  } catch (err) {
    if (err.code === "ENOENT") return [];
    if (err instanceof SyntaxError) return [];
    throw err;
  }
}

function writeAll(jobs) {
  const file = jobsFile();
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify({ jobs }, null, 2) + "\n", "utf8");
  renameSync(tmp, file);
}

export function newTaskId(prefix = "cc") {
  const ts = Date.now().toString(36);
  const rand = randomUUID().split("-")[0];
  return `${prefix}-${ts}-${rand}`;
}

export function loadJobs() {
  return readAll();
}

export function saveJobs(jobs) {
  const release = acquireLock();
  try { writeAll(jobs); } finally { release(); }
}

// Atomically mutate the jobs list. `mutator` receives a copy and returns it.
export function updateJobs(mutator) {
  const release = acquireLock();
  try {
    const jobs = readAll();
    const next = mutator(jobs) || jobs;
    writeAll(next);
    return next;
  } finally {
    release();
  }
}

export function getJob(taskId) {
  return loadJobs().find((j) => j.id === taskId) || null;
}

export function upsertJob(job) {
  return updateJobs((jobs) => {
    const idx = jobs.findIndex((j) => j.id === job.id);
    const merged = idx >= 0 ? { ...jobs[idx], ...job, updatedAt: Date.now() } : { ...job, updatedAt: Date.now() };
    if (idx >= 0) jobs[idx] = merged;
    else jobs.push({ ...job, createdAt: job.createdAt || Date.now(), updatedAt: Date.now() });
    return jobs;
  });
}

export function removeJob(taskId) {
  return updateJobs((jobs) => jobs.filter((j) => j.id !== taskId));
}

export function listJobsForRepo(repoRoot) {
  const all = loadJobs();
  const filtered = repoRoot ? all.filter((j) => j.repoRoot === repoRoot) : all;
  return filtered.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function latestRescueForRepo(repoRoot) {
  const jobs = listJobsForRepo(repoRoot).filter((j) => j.kind === "rescue");
  return jobs.find((j) => j.status === "running") || jobs[0] || null;
}

export function createJob({ id, kind, repoRoot, pid, logPath, model, effort, claudeSessionId, args }) {
  const now = Date.now();
  return {
    id,
    kind,
    repoRoot,
    status: "running",
    pid: pid ?? null,
    logPath,
    claudeSessionId: claudeSessionId || null,
    model: model || null,
    effort: effort || null,
    args: args || {},
    createdAt: now,
    updatedAt: now,
  };
}