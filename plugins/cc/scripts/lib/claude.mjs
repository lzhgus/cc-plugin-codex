// High-level wrapper around the `claude` CLI in headless (`-p`) mode.
//
// The original codex-plugin-cc wraps the Codex *app server* because `codex exec`
// is limited. Claude Code has a clean headless CLI with structured output, so
// we can talk to it directly: `claude -p <prompt> --output-format json`.
import { runForeground, spawnDetached } from "./process.mjs";
import { findClaudeBin, ensureDataDir } from "./fs.mjs";
import { join } from "node:path";
import { normalizeModel } from "./args.mjs";

const PING_TIMEOUT_MS = 30_000;

export function claudePath() {
  return findClaudeBin();
}

export function isInstalled() {
  return claudePath() !== null;
}

export function version() {
  const bin = claudePath();
  if (!bin) return null;
  const res = runForeground({ cmd: bin, args: ["--version"], timeoutMs: 10_000 });
  return { ok: res.code === 0, version: (res.stdout || "").trim(), stderr: res.stderr };
}

// Light auth check: run a tiny print-mode request. Requires Claude Code login
// (OAuth or ANTHROPIC_API_KEY) already present. Returns { ok, detail, raw }.
export function ping() {
  const bin = claudePath();
  if (!bin) return { ok: false, detail: "claude binary not found on PATH" };
  const res = runForeground({
    cmd: bin,
    args: ["-p", "Reply with the single word: ok", "--output-format", "json", "--dangerously-skip-permissions"],
    timeoutMs: PING_TIMEOUT_MS,
  });
  if (res.timedOut) return { ok: false, detail: "timed out waiting for claude", raw: res };
  if (res.code !== 0) {
    const detail = (res.stderr || res.stdout || "").trim().slice(0, 500);
    return { ok: false, detail: detail || `claude exited with status ${res.code}`, raw: res };
  }
  return { ok: true, detail: parseResult(res.stdout) };
}

// Build the argv for a `claude -p` invocation.
export function buildArgs({
  prompt,
  model,
  effort,
  addDir,
  allowedTools,
  disallowedTools,
  resume,
  outputFormat = "json",
  systemPrompt,
  appendSystemPrompt,
  jsonSchema,
  name,
  dangerousSkipPermissions = true,
  extraArgs = [],
}) {
  const args = ["-p", prompt || ""];
  const m = normalizeModel(model);
  if (m) args.push("--model", m);
  if (effort) args.push("--effort", effort);
  if (outputFormat) args.push("--output-format", outputFormat);
  if (resume) args.push("--resume", resume);
  if (name) args.push("--name", name);
  if (systemPrompt) args.push("--system-prompt", systemPrompt);
  if (appendSystemPrompt) args.push("--append-system-prompt", appendSystemPrompt);
  if (dangerousSkipPermissions) args.push("--dangerously-skip-permissions");
  if (Array.isArray(addDir)) {
    for (const d of addDir) args.push("--add-dir", d);
  } else if (addDir) {
    args.push("--add-dir", addDir);
  }
  if (Array.isArray(allowedTools) && allowedTools.length) {
    args.push("--allowed-tools", allowedTools.join(","));
  }
  if (Array.isArray(disallowedTools) && disallowedTools.length) {
    args.push("--disallowed-tools", disallowedTools.join(","));
  }
  if (jsonSchema) {
    args.push("--json-schema", typeof jsonSchema === "string" ? jsonSchema : JSON.stringify(jsonSchema));
  }
  args.push(...extraArgs);
  return args;
}

// Run claude in the foreground and parse the JSON result. Returns:
//   { ok, text, session_id, is_error, cost_usd, raw, stderr, code }
export function exec(opts) {
  const bin = claudePath();
  if (!bin) return { ok: false, error: "claude binary not found on PATH" };
  const args = buildArgs(opts);
  const res = runForeground({
    cmd: bin,
    args,
    cwd: opts.cwd,
    env: opts.env,
    timeoutMs: opts.timeoutMs || 0,
  });
  if (res.code !== 0) {
    return {
      ok: false,
      error: (res.stderr || res.stdout || "").trim().slice(0, 2000) || `claude exited with status ${res.code}`,
      code: res.code,
      raw: res,
    };
  }
  const parsed = parseResult(res.stdout);
  return {
    ok: true,
    text: parsed.result ?? "",
    session_id: parsed.session_id ?? null,
    is_error: parsed.is_error ?? false,
    cost_usd: parsed.total_cost_usd ?? null,
    raw: parsed,
    code: res.code,
  };
}

// Spawn claude in the background, logging to logPath. Returns { pid }.
export function execBackground(opts) {
  const bin = claudePath();
  if (!bin) throw new Error("claude binary not found on PATH");
  const args = buildArgs(opts);
  const { pid } = spawnDetached({
    cmd: bin,
    args,
    cwd: opts.cwd,
    env: opts.env,
    logPath: opts.logPath,
  });
  return { pid };
}

// Parse `claude -p --output-format json` stdout. Returns {} if unparseable.
export function parseResult(stdout) {
  if (!stdout) return {};
  try {
    return JSON.parse(stdout);
  } catch (err) {
    // Fall back to treating stdout as plain text.
    return { result: String(stdout).trim() };
  }
}

// Read-only tool allowlist for reviews: deny file mutation and shell mutation
// so a review can never change code. We pass this via --allowed-tools to lock
// the session down to read + search.
export const REVIEW_ALLOWED_TOOLS = [
  "Read",
  "Glob",
  "Grep",
  "Bash(git status)",
  "Bash(git diff*)",
  "Bash(git show*)",
  "Bash(git log*)",
  "Bash(git rev-parse*)",
  "Bash(git ls-files*)",
];

export const REVIEW_DISALLOWED_TOOLS = ["Edit", "Write", "NotebookEdit", "Bash(git add*)", "Bash(git commit*)", "Bash(git push*)", "Bash(git apply*)", "Bash(git checkout*)", "Bash(git reset*)"];

export function reviewToolArgs() {
  return {
    allowedTools: REVIEW_ALLOWED_TOOLS,
    disallowedTools: REVIEW_DISALLOWED_TOOLS,
  };
}