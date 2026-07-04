// Filesystem + path helpers for the cc-plugin-codex companion.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, statSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Directory of this file: .../scripts/lib
const HERE = dirname(fileURLToPath(import.meta.url));

// Plugin root = .../plugins/cc (two levels up from scripts/lib)
export const PLUGIN_ROOT = resolve(HERE, "..", "..");

// Per-plugin data dir. Codex stores plugin-private data under
// ~/.codex/plugins/data/<marketplace>-<plugin>; for this plugin that is
// `cc-plugin-codex-cc`. Override with CC_PLUGIN_DATA_DIR (used by tests).
export function dataDir() {
  if (process.env.CC_PLUGIN_DATA_DIR) return process.env.CC_PLUGIN_DATA_DIR;
  return join(homedir(), ".codex", "plugins", "data", "cc-plugin-codex-cc");
}

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function ensureDataDir() {
  return ensureDir(dataDir());
}

export function readJson(file, fallback = undefined) {
  try {
    const txt = readFileSync(file, "utf8");
    return JSON.parse(txt);
  } catch (err) {
    if (err.code === "ENOENT" || err.code === "ENOTDIR") return fallback;
    if (err instanceof SyntaxError) return fallback;
    throw err;
  }
}

// Atomic JSON write: write to a temp file then rename.
export function writeJson(file, obj) {
  ensureDir(dirname(file));
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(obj, null, 2) + "\n", "utf8");
  renameSync(tmp, file);
}

export function readText(file, fallback = undefined) {
  try {
    return readFileSync(file, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

export function writeText(file, text) {
  ensureDir(dirname(file));
  writeFileSync(file, text, "utf8");
}

export function fileExists(file) {
  return existsSync(file);
}

export function mtime(file) {
  try {
    return statSync(file).mtimeMs;
  } catch (err) {
    if (err.code === "ENOENT") return -1;
    throw err;
  }
}

// Resolve the `claude` binary path. Honors CLAUDE_BIN override; otherwise
// searches PATH. Returns null if not found.
export function findClaudeBin(explicit = process.env.CLAUDE_BIN) {
  if (explicit && existsSync(explicit)) return explicit;
  const cmd = platform() === "win32" ? "where" : "which";
  const { status, stdout } = spawnSync(cmd, ["claude"], { encoding: "utf8" });
  if (status !== 0) return null;
  const path = stdout.split("\n").map((s) => s.trim()).filter(Boolean)[0];
  return path && existsSync(path) ? path : null;
}

export function jobsFile() {
  return join(dataDir(), "jobs.json");
}

export function logPathFor(taskId) {
  return join(dataDir(), `${taskId}.log`);
}
