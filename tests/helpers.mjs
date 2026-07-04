// Shared test helpers: temp dirs, fake-claude fixture, MCP client.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
export const REPO_ROOT = join(HERE, "..");
export const COMPANION = join(REPO_ROOT, "plugins", "cc", "scripts", "claude-companion.mjs");

export function mkdtemp(prefix = "cc-test-") {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function withTempDataDir(fn) {
  const dir = mkdtemp("cc-data-");
  const old = process.env.CC_PLUGIN_DATA_DIR;
  process.env.CC_PLUGIN_DATA_DIR = dir;
  try {
    return fn(dir);
  } finally {
    process.env.CC_PLUGIN_DATA_DIR = old;
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

// Async variant that also provides a `sleep` helper to the test, so tests can
// guarantee strictly-increasing timestamps when ordering matters.
export async function withTempDataDirAsync(fn) {
  const dir = mkdtemp("cc-data-");
  const old = process.env.CC_PLUGIN_DATA_DIR;
  process.env.CC_PLUGIN_DATA_DIR = dir;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    return await fn(sleep);
  } finally {
    process.env.CC_PLUGIN_DATA_DIR = old;
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

// Write a fake `claude` executable to a temp dir and return its path. The fake
// responds to `--version`, `-p ... --output-format json`, and
// `-p ... --output-format stream-json` with canned output. It also writes the
// argv it was called with to <dataDir>/fake-claude-calls.log when
// FAKE_CLAUDE_LOG is set, so tests can assert on argv.
export function makeFakeClaude({ version = "fake-claude 0.0.0", result = "ok", sessionId = "sess-fake-1", streamEvents = null, hang = false } = {}) {
  const dir = mkdtemp("cc-fake-");
  const fakePath = join(dir, "claude");
  const events = streamEvents || [
    { type: "assistant_message", message: { role: "assistant", content: [{ type: "text", text: result }] } },
    { type: "result", result, session_id: sessionId, is_error: false, total_cost_usd: 0.001 },
  ];
  const script = `#!/usr/bin/env node
import { writeFileSync, appendFileSync } from "node:fs";
const argv = process.argv.slice(2);
if (process.env.FAKE_CLAUDE_LOG) appendFileSync(process.env.FAKE_CLAUDE_LOG, JSON.stringify(argv) + "\\n");
if (argv[0] === "--version") { process.stdout.write(${JSON.stringify(version)} + "\\n"); process.exit(0); }
const fmtIdx = argv.indexOf("--output-format");
const fmt = fmtIdx >= 0 ? argv[fmtIdx + 1] : "text";
const promptIdx = argv.indexOf("-p");
const prompt = promptIdx >= 0 ? argv[promptIdx + 1] : "";
if (fmt === "stream-json") {
  const events = ${JSON.stringify(JSON.stringify(events))};
  for (const line of JSON.parse(events)) process.stdout.write(JSON.stringify(line) + "\\n");
  ${hang ? "setInterval(() => {}, 60000); process.stdout.write('');" : "process.exit(0);"}
}
// default json
process.stdout.write(JSON.stringify({ result: ${JSON.stringify(result)}, session_id: ${JSON.stringify(sessionId)}, is_error: false, total_cost_usd: 0.001 }) + "\\n");
process.exit(0);
`;
  writeFileSync(fakePath, script, { mode: 0o755 });
  return { fakePath, dir };
}

// Spawn the companion MCP server with a given env, returning { stdin, stdout, lines, kill, send }.
export function spawnMcp(env = {}, cwd) {
  const child = spawn("node", [COMPANION], {
    env: { ...process.env, ...env },
    cwd,
    stdio: ["pipe", "pipe", "inherit"],
  });
  const lines = [];
  let buffer = "";
  child.stdout.on("data", (d) => {
    buffer += d.toString("utf8");
    let nl;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (line.trim()) lines.push(line);
    }
  });
  function send(obj) {
    child.stdin.write(JSON.stringify(obj) + "\n");
  }
  function waitForResponse(id, timeoutMs = 5000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      function tick() {
        for (const line of lines) {
          try {
            const obj = JSON.parse(line);
            if (obj.id === id) return resolve(obj);
          } catch { /* ignore */ }
        }
        if (Date.now() - start > timeoutMs) return reject(new Error(`timeout waiting for id=${id}`));
        setTimeout(tick, 20);
      }
      tick();
    });
  }
  return { child, send, waitForResponse, lines, kill: () => child.kill() };
}

export async function callTool(env, name, args = {}) {
  const mcp = spawnMcp(env);
  try {
    mcp.send({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
    await mcp.waitForResponse(1);
    mcp.send({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name, arguments: args } });
    const res = await mcp.waitForResponse(2, 10000);
    return res;
  } finally {
    mcp.kill();
  }
}

export function textOf(res) {
  const c = res?.result?.content;
  if (!Array.isArray(c)) return "";
  return c.map((b) => b.text || "").join("\n");
}