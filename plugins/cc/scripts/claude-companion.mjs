#!/usr/bin/env node
// claude-companion.mjs — stdio MCP server for the cc-plugin-codex Codex plugin.
//
// Exposes tools that wrap the locally installed `claude` CLI in headless mode
// so Codex can review code with, and delegate tasks to, Claude Code.
//
// The server speaks the Model Context Protocol over stdio (newline-delimited
// JSON-RPC 2.0). It also doubles as a tiny CLI for ad-hoc smoke checks:
//   node claude-companion.mjs --selftest
//   node claude-companion.mjs --tools
import { createInterface } from "node:readline";
import { join } from "node:path";
import {
  ensureDataDir,
  logPathFor,
} from "./lib/fs.mjs";
import {
  newTaskId,
  upsertJob,
  getJob,
  listJobsForRepo,
  latestRescueForRepo,
  createJob,
} from "./lib/state.mjs";
import { isAlive, killPid, waitForExit, terminatePid } from "./lib/process.mjs";
import * as claude from "./lib/claude.mjs";
import { resolveDiff, hasChanges } from "./lib/git.mjs";
import { reviewPrompt, adversarialReviewPrompt, rescuePrompt } from "./lib/prompts.mjs";
import { renderResult, renderStreamLog, tailLog } from "./lib/render.mjs";
import { resolveRepo, findCodexSession } from "./lib/workspace.mjs";
import { transferSummary } from "./lib/codex-session-transfer.mjs";
import { readFileSync } from "node:fs";

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: "cc_setup",
    description:
      "Check whether Claude Code is installed and authenticated on this machine. Returns the claude version and auth status. Use before any other cc_* tool. Also manages the optional review-gate flag (enable_review_gate / disable_review_gate), which is advisory in Codex (the plugin notes it for future Stop-hook support).",
    inputSchema: {
      type: "object",
      properties: {
        enable_review_gate: { type: "boolean", description: "Enable the optional review gate (advisory in Codex)." },
        disable_review_gate: { type: "boolean", description: "Disable the optional review gate." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cc_review",
    description:
      "Run a read-only Claude Code code review on the current work. By default reviews uncommitted changes vs HEAD; pass `base` to review the branch vs a base ref (e.g. 'main'). Read-only: Claude cannot modify files. Supports `background` (return immediately, check with cc_status/cc_result) and `wait` (block for the result). If neither is set, blocks.",
    inputSchema: {
      type: "object",
      properties: {
        base: { type: "string", description: "Base git ref to review against (e.g. 'main'). If omitted, reviews uncommitted changes vs HEAD." },
        background: { type: "boolean", description: "Run in the background; return a task id immediately." },
        wait: { type: "boolean", description: "Block until the review finishes (default when background is false)." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cc_adversarial_review",
    description:
      "Run a steerable, adversarial Claude Code review that challenges the chosen implementation and design. Use to pressure-test assumptions, tradeoffs, and failure modes. Read-only. Accepts free-text `focus`. Same flags as cc_review.",
    inputSchema: {
      type: "object",
      properties: {
        base: { type: "string" },
        focus: { type: "string", description: "Free-text focus for the adversarial review." },
        background: { type: "boolean" },
        wait: { type: "boolean" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cc_rescue",
    description:
      "Delegate a task to Claude Code headless. Claude investigates and can make changes. Supports `model` (aliases: fable, opus, sonnet, haiku), `effort` (low|medium|high|xhigh|max), `background`, `wait`, `resume` (a prior Claude session id to continue), and `fresh` (do not resume). If neither `resume` nor `fresh` is set, starts a fresh session.",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string", description: "The task to hand to Claude Code." },
        model: { type: "string", description: "Claude model alias or full name (fable, opus, sonnet, haiku, claude-fable-5, ...)." },
        effort: { type: "string", enum: ["low", "medium", "high", "xhigh", "max"] },
        background: { type: "boolean" },
        wait: { type: "boolean" },
        resume: { type: "string", description: "Claude Code session id to resume." },
        fresh: { type: "boolean", description: "Force a fresh session (do not resume the latest)." },
      },
      required: ["task"],
      additionalProperties: false,
    },
  },
  {
    name: "cc_transfer",
    description:
      "Convert the current Codex session into a Claude Code session. Reads the Codex session transcript, summarizes it into a seed prompt, starts a new Claude Code session, and returns a `claude --resume <session-id>` command you can run to continue in Claude Code directly. Best-effort: not a lossless import.",
    inputSchema: {
      type: "object",
      properties: {
        source: { type: "string", description: "Override the Codex session JSONL path. If omitted, the most recent session for this repo is used." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cc_status",
    description: "Show running and recent Claude Code jobs for this repository. Pass `task_id` to filter to one job.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cc_result",
    description: "Show the stored final output of a finished Claude Code job, plus the Claude session id for `claude --resume`. Defaults to the most recent job for this repo.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cc_cancel",
    description: "Cancel an active background Claude Code job. Defaults to the most recent running job for this repo.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string" },
      },
      additionalProperties: false,
    },
  },
];

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

function ok(text) {
  return { content: [{ type: "text", text: typeof text === "string" ? text : JSON.stringify(text, null, 2) }] };
}

function err(text) {
  return { content: [{ type: "text", text }], isError: true };
}

function repoOrError() {
  const repo = resolveRepo();
  if (!repo) return { error: "Not inside a git repository. cc tools that need a review target require a git repo." };
  return { repo };
}

function ensureReviewTarget(cwd, base) {
  if (!hasChanges(cwd, base)) {
    return { error: base
      ? `No changes on this branch vs base "${base}". Nothing to review.`
      : "No uncommitted changes vs HEAD. Nothing to review." };
  }
  return resolveDiff(cwd, base);
}

async function toolSetup(args) {
  const installed = claude.isInstalled();
  const ver = installed ? claude.version() : null;
  let authed = null;
  if (installed && ver?.ok) {
    const p = claude.ping();
    authed = p.ok ? true : p.detail;
  }
  let reviewGate = false;
  try { reviewGate = readFileSync(join(ensureDataDir(), "review-gate"), "utf8").trim() === "on"; } catch { reviewGate = false; }
  if (args?.enable_review_gate) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(join(ensureDataDir(), "review-gate"), "on", "utf8");
    reviewGate = true;
  }
  if (args?.disable_review_gate) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(join(ensureDataDir(), "review-gate"), "off", "utf8");
    reviewGate = false;
  }
  const lines = [
    `claude installed: ${installed ? "yes" : "no"}`,
    `claude version: ${ver?.version || "n/a"}`,
    `authenticated: ${authed === true ? "yes" : authed === null ? "unknown" : `no (${authed})`}`,
    `review gate: ${reviewGate ? "on (advisory in Codex)" : "off"}`,
  ];
  if (!installed) {
    lines.push("");
    lines.push("Install Claude Code:  curl -fsSL https://claude.ai/install.sh | bash");
    lines.push("Windows PowerShell:   irm https://claude.ai/install.ps1 | iex");
    lines.push("Then run /cc:setup again.");
  } else if (authed !== true && authed !== null) {
    lines.push("");
    lines.push("Sign in with:  !claude login   (or set ANTHROPIC_API_KEY)");
  }
  return ok(lines.join("\n"));
}

async function runReview({ kind, base, focus, background, wait }) {
  const r = repoOrError();
  if (r.error) return err(r.error);
  const diff = ensureReviewTarget(r.repo, base);
  if (diff.error) return err(diff.error);
  const prompt = kind === "adversarial"
    ? adversarialReviewPrompt({ diff: diff.diff, stat: diff.stat, base, focus, repoRoot: r.repo })
    : reviewPrompt({ diff: diff.diff, stat: diff.stat, base, repoRoot: r.repo });
  const opts = {
    prompt,
    cwd: r.repo,
    addDir: r.repo,
    ...claude.reviewToolArgs(),
  };
  if (background) {
    return startBackground({ kind, repo: r.repo, opts, label: kind === "adversarial" ? "adversarial review" : "review" });
  }
  const res = claude.exec({ ...opts, outputFormat: "json" });
  if (!res.ok) return err(res.error || "claude review failed");
  recordCompleted({ kind, repo: r.repo, sessionId: res.session_id, model: opts.model, effort: opts.effort });
  return ok(renderResult(res.raw));
}

async function runRescue({ task, model, effort, background, wait, resume, fresh }) {
  if (!task) return err("`task` is required.");
  if (resume && fresh) return err("Choose either `resume` or `fresh`, not both.");
  const r = repoOrError();
  const repo = r.repo || process.cwd();
  const prompt = rescuePrompt({ task, repoRoot: repo, resume });
  const opts = { prompt, model, effort, cwd: repo, addDir: repo, resume: fresh ? undefined : resume };
  if (background) {
    return startBackground({ kind: "rescue", repo, opts, label: "rescue", sessionIdHint: fresh ? undefined : resume });
  }
  const res = claude.exec({ ...opts, outputFormat: "json" });
  if (!res.ok) return err(res.error || "claude rescue failed");
  recordCompleted({ kind: "rescue", repo, sessionId: res.session_id, model, effort });
  return ok(renderResult(res.raw));
}

async function runTransfer({ source }) {
  const r = repoOrError();
  const repo = r.repo || process.cwd();
  const session = findCodexSession({ source, cwd: process.cwd() });
  if (!session) return err("Could not find a Codex session to transfer. Pass `source` with an explicit session JSONL path.");
  let summary;
  try { summary = transferSummary(session); }
  catch (e) { return err(`Failed to read Codex session: ${e.message}`); }
  if (!summary.count) return err("The Codex session had no readable turns to transfer.");
  const res = claude.exec({
    prompt: summary.seed,
    cwd: repo,
    addDir: repo,
    outputFormat: "json",
  });
  if (!res.ok) return err(res.error || "claude transfer failed");
  recordCompleted({ kind: "transfer", repo, sessionId: res.session_id });
  const cmd = res.session_id ? `claude --resume ${res.session_id}` : "(no session id returned)";
  return ok([
    `Transferred ${summary.count} turns from Codex session:`,
    `  ${session}`,
    ``,
    `Continue in Claude Code with:`,
    `  ${cmd}`,
    ``,
    res.session_id ? `Claude started a new session (${res.session_id}) seeded with the Codex transcript.` : `Claude produced a result but did not return a session id.`,
    ``,
    `Note: transfer is best-effort — Codex and Claude Code use different session formats, so this is a summary, not a lossless import.`,
  ].join("\n"));
}

async function runStatus({ task_id }) {
  const r = repoOrError();
  const jobs = refreshJobs(listJobsForRepo(r.repo));
  const filtered = task_id ? jobs.filter((j) => j.id === task_id) : jobs;
  if (!filtered.length) return ok(task_id ? `No job found with id ${task_id}.` : "No Claude Code jobs recorded for this repo yet.");
  const lines = filtered.slice(0, 20).map(jobLine);
  return ok(["Claude Code jobs:", ...lines].join("\n"));
}

async function runResult({ task_id }) {
  const r = repoOrError();
  const jobs = refreshJobs(listJobsForRepo(r.repo));
  const job = task_id ? jobs.find((j) => j.id === task_id) : jobs[0];
  if (!job) return ok(task_id ? `No job found with id ${task_id}.` : "No Claude Code jobs recorded for this repo yet.");
  const log = safeReadText(job.logPath);
  const parsed = renderStreamLog(log);
  const out = [
    `Job ${job.id} — ${job.kind} — ${job.status}`,
    job.claudeSessionId ? `Claude session: ${job.claudeSessionId}` : (parsed.session_id ? `(session from log: ${parsed.session_id})` : "Claude session: (none)"),
    ``,
    parsed.text || "(no output)",
  ];
  if (job.status === "running" && !parsed.done) out.push("", "(job still running)");
  if (job.claudeSessionId || parsed.session_id) {
    const sid = job.claudeSessionId || parsed.session_id;
    out.push("", `Resume in Claude Code:  claude --resume ${sid}`);
  }
  return ok(out.join("\n"));
}

function refreshJobs(jobs) {
  return jobs.map(refreshJob);
}

function refreshJob(job) {
  if (!job || job.status !== "running" || !job.logPath) return job;
  const parsed = renderStreamLog(safeReadText(job.logPath));
  if (!parsed.done) return job;
  const next = {
    ...job,
    status: parsed.isError ? "failed" : "completed",
    claudeSessionId: job.claudeSessionId || parsed.session_id || null,
    updatedAt: Date.now(),
  };
  upsertJob(next);
  return next;
}

async function runCancel({ task_id }) {
  const r = repoOrError();
  const jobs = listJobsForRepo(r.repo).filter((j) => j.status === "running");
  const job = task_id ? jobs.find((j) => j.id === task_id) : jobs[0];
  if (!job) return ok(task_id ? `No running job found with id ${task_id}.` : "No running Claude Code jobs for this repo.");
  if (job.pid && isAlive(job.pid)) {
    await terminatePid(job.pid, { graceMs: 800, killTimeoutMs: 3000 });
  }
  upsertJob({ ...job, status: "cancelled" });
  return ok(`Cancelled job ${job.id}.`);
}

// ---------------------------------------------------------------------------
// Background helpers
// ---------------------------------------------------------------------------

function startBackground({ kind, repo, opts, label, sessionIdHint }) {
  ensureDataDir();
  const id = newTaskId();
  const logPath = logPathFor(id);
  const { pid } = claude.execBackground({
    ...opts,
    outputFormat: "stream-json",
    logPath,
  });
  const job = createJob({
    id,
    kind,
    repoRoot: repo,
    pid,
    logPath,
    model: opts.model || null,
    effort: opts.effort || null,
    claudeSessionId: sessionIdHint || null,
    args: { label },
  });
  upsertJob(job);
  return ok([
    `Started ${label} in the background.`,
    `task id: ${id}`,
    `pid: ${pid}`,
    `log:  ${logPath}`,
    ``,
    `Check progress:  cc_status  /  cc_result  (with task_id: "${id}")`,
    `Cancel:           cc_cancel  (with task_id: "${id}")`,
  ].join("\n"));
}

function recordCompleted({ kind, repo, sessionId, model, effort }) {
  if (!sessionId) return;
  const id = newTaskId();
  const job = createJob({
    id,
    kind,
    repoRoot: repo,
    pid: null,
    logPath: null,
    claudeSessionId: sessionId,
    model: model || null,
    effort: effort || null,
    args: { foreground: true },
  });
  job.status = "completed";
  upsertJob(job);
}

function jobLine(j) {
  const when = new Date(j.updatedAt || j.createdAt || 0).toISOString();
  const sid = j.claudeSessionId ? ` sid=${j.claudeSessionId}` : "";
  return `  ${j.id}  [${j.status}]  ${j.kind}  ${when}${sid}`;
}

function safeReadText(file) {
  if (!file) return "";
  try { return readFileSync(file, "utf8"); } catch { return ""; }
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

const HANDLERS = {
  cc_setup: toolSetup,
  cc_review: (a) => runReview({ kind: "review", ...a }),
  cc_adversarial_review: (a) => runReview({ kind: "adversarial", ...a }),
  cc_rescue: runRescue,
  cc_transfer: runTransfer,
  cc_status: runStatus,
  cc_result: runResult,
  cc_cancel: runCancel,
};

async function dispatch(name, args) {
  const h = HANDLERS[name];
  if (!h) return err(`Unknown tool: ${name}`);
  try {
    return await h(args || {});
  } catch (e) {
    return err(`cc tool ${name} threw: ${e && e.stack ? e.stack : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// MCP stdio server
// ---------------------------------------------------------------------------

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "claude-code-companion", version: "0.1.0" };

function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}
function rpcError(id, code, message, data) {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

async function handleRequest(req) {
  const { id, method, params } = req;
  try {
    switch (method) {
      case "initialize":
        return rpcResult(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        });
      case "tools/list":
        return rpcResult(id, { tools: TOOLS });
      case "tools/call": {
        const { name, arguments: args } = params || {};
        const out = await dispatch(name, args);
        return rpcResult(id, out);
      }
      case "ping":
        return rpcResult(id, {});
      default:
        return rpcError(id, -32601, `Method not found: ${method}`);
    }
  } catch (e) {
    return rpcError(id, -32603, `Internal error: ${e && e.message}`, String(e));
  }
}

function startServer() {
  const rl = createInterface({ input: process.stdin });
  rl.on("line", async (line) => {
    const txt = line.trim();
    if (!txt) return;
    let req;
    try { req = JSON.parse(txt); } catch { return; }
    // Notifications (no id) get no response.
    if (req.id === undefined || req.id === null) return;
    const res = await handleRequest(req);
    process.stdout.write(JSON.stringify(res) + "\n");
  });
  // Keep stdin open; exit cleanly on EOF.
  rl.on("close", () => process.exit(0));
}

// ---------------------------------------------------------------------------
// CLI helpers (selftest / tools dump) — not part of MCP
// ---------------------------------------------------------------------------

async function cliSelftest() {
  const out = [];
  out.push(`claude installed: ${claude.isInstalled()}`);
  const v = claude.version();
  out.push(`claude version: ${v?.version || "n/a"} (ok=${v?.ok})`);
  const p = claude.ping();
  out.push(`ping ok: ${p.ok}`);
  if (!p.ok) out.push(`ping detail: ${p.detail}`);
  out.push(`tools: ${TOOLS.map((t) => t.name).join(", ")}`);
  out.push(`data dir: ${ensureDataDir()}`);
  process.stdout.write(out.join("\n") + "\n");
  process.exit(0);
}

function cliTools() {
  process.stdout.write(JSON.stringify({ tools: TOOLS }, null, 2) + "\n");
  process.exit(0);
}

// Entry
const arg0 = process.argv[2];
if (arg0 === "--selftest") cliSelftest();
else if (arg0 === "--tools") cliTools();
else startServer();
