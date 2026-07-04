import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnMcp, makeFakeClaude, textOf } from "./helpers.mjs";

function sh(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, encoding: "utf8" });
}

function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), "cc-mcp-"));
  sh("git", ["init", "-q", "-b", "main"], dir);
  sh("git", ["config", "user.email", "t@t.t"], dir);
  sh("git", ["config", "user.name", "Test"], dir);
  writeFileSync(join(dir, "a.txt"), "hello\n");
  sh("git", ["add", "."], dir);
  sh("git", ["commit", "-q", "-m", "init"], dir);
  return dir;
}

function envWith(fakePath, dataDir) {
  return {
    CLAUDE_BIN: fakePath,
    CC_PLUGIN_DATA_DIR: dataDir,
  };
}

async function rpc(mcp, id, method, params) {
  mcp.send({ jsonrpc: "2.0", id, method, params });
  return mcp.waitForResponse(id, 15000);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function pollUntil(fn, predicate, { timeoutMs = 3000, intervalMs = 50 } = {}) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeoutMs) {
    last = await fn();
    if (predicate(last)) return last;
    await sleep(intervalMs);
  }
  return last;
}

test("initialize + tools/list returns 8 tools", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "cc-data-"));
  const { fakePath, dir: fakeDir } = makeFakeClaude();
  const mcp = spawnMcp(envWith(fakePath, dataDir));
  try {
    const init = await rpc(mcp, 1, "initialize", {});
    assert.equal(init.result.protocolVersion, "2024-11-05");
    assert.equal(init.result.serverInfo.name, "claude-code-companion");
    const list = await rpc(mcp, 2, "tools/list", {});
    const names = list.result.tools.map((t) => t.name);
    assert.deepEqual(names, [
      "cc_setup", "cc_review", "cc_adversarial_review", "cc_rescue",
      "cc_transfer", "cc_status", "cc_result", "cc_cancel",
    ]);
    for (const name of names.filter((toolName) => toolName !== "cc_setup")) {
      const tool = list.result.tools.find((t) => t.name === name);
      assert.ok(tool.inputSchema.properties.repo_path, `${name} should accept explicit repo_path`);
    }
  } finally {
    mcp.kill();
    rmSync(dataDir, { recursive: true, force: true });
    rmSync(fakeDir, { recursive: true, force: true });
  }
});

test("cc_setup reports installed + authenticated with fake claude", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "cc-data-"));
  const { fakePath, dir: fakeDir } = makeFakeClaude();
  const mcp = spawnMcp(envWith(fakePath, dataDir));
  try {
    const res = await rpc(mcp, 1, "tools/call", { name: "cc_setup", arguments: {} });
    const txt = textOf(res);
    assert.match(txt, /claude installed: yes/);
    assert.match(txt, /authenticated: yes/);
  } finally {
    mcp.kill();
    rmSync(dataDir, { recursive: true, force: true });
    rmSync(fakeDir, { recursive: true, force: true });
  }
});

test("cc_rescue foreground runs fake claude and records a completed job", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "cc-data-"));
  const repo = makeRepo();
  const { fakePath, dir: fakeDir } = makeFakeClaude({ result: "fixed it", sessionId: "sess-rescue-1" });
  const mcp = spawnMcp(envWith(fakePath, dataDir), repo);
  try {
    const res = await rpc(mcp, 1, "tools/call", {
      name: "cc_rescue",
      arguments: { task: "fix the flaky test" },
    });
    const txt = textOf(res);
    assert.match(txt, /fixed it/);
    assert.match(txt, /session: `sess-rescue-1`/);

    const status = await rpc(mcp, 2, "tools/call", { name: "cc_status", arguments: {} });
    assert.match(textOf(status), /rescue/);

    const result = await rpc(mcp, 3, "tools/call", { name: "cc_result", arguments: {} });
    const rtxt = textOf(result);
    assert.match(rtxt, /sess-rescue-1/);
    assert.match(rtxt, /Resume in Claude Code:  claude --resume sess-rescue-1/);
  } finally {
    mcp.kill();
    rmSync(dataDir, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeDir, { recursive: true, force: true });
  }
});

test("cc_rescue passes resume session id through to claude", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "cc-data-"));
  const repo = makeRepo();
  const callsLog = join(dataDir, "fake-claude-calls.log");
  const { fakePath, dir: fakeDir } = makeFakeClaude({ result: "continued", sessionId: "sess-rescue-2" });
  const mcp = spawnMcp({ ...envWith(fakePath, dataDir), FAKE_CLAUDE_LOG: callsLog }, repo);
  try {
    const res = await rpc(mcp, 1, "tools/call", {
      name: "cc_rescue",
      arguments: { task: "continue the fix", resume: "sess-existing-1" },
    });
    assert.match(textOf(res), /continued/);

    const calls = readFileSync(callsLog, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const rescueCall = calls.find((argv) => argv.some((arg) => String(arg).includes("continue the fix")));
    assert.ok(rescueCall, "fake claude did not record the rescue call");
    assert.deepEqual(rescueCall.slice(rescueCall.indexOf("--resume"), rescueCall.indexOf("--resume") + 2), [
      "--resume",
      "sess-existing-1",
    ]);
  } finally {
    mcp.kill();
    rmSync(dataDir, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeDir, { recursive: true, force: true });
  }
});

test("cc_review with no changes returns a clear message", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "cc-data-"));
  const repo = makeRepo();
  const { fakePath, dir: fakeDir } = makeFakeClaude();
  const mcp = spawnMcp(envWith(fakePath, dataDir), repo);
  try {
    const res = await rpc(mcp, 1, "tools/call", { name: "cc_review", arguments: {} });
    assert.equal(res.result?.isError, true);
    assert.match(textOf(res), /No uncommitted changes/);
  } finally {
    mcp.kill();
    rmSync(dataDir, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeDir, { recursive: true, force: true });
  }
});

test("cc_review with changes returns the rendered review", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "cc-data-"));
  const repo = makeRepo();
  writeFileSync(join(repo, "a.txt"), "hello world\n");
  sh("git", ["add", "."], repo);
  const { fakePath, dir: fakeDir } = makeFakeClaude({ result: "LGTM", sessionId: "sess-rev-1" });
  const mcp = spawnMcp(envWith(fakePath, dataDir), repo);
  try {
    const res = await rpc(mcp, 1, "tools/call", { name: "cc_review", arguments: {} });
    assert.match(textOf(res), /LGTM/);
  } finally {
    mcp.kill();
    rmSync(dataDir, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeDir, { recursive: true, force: true });
  }
});

test("cc_review uses explicit repo_path when MCP cwd is not the repo", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "cc-data-"));
  const pluginCwd = mkdtempSync(join(tmpdir(), "cc-plugin-cwd-"));
  const repo = makeRepo();
  writeFileSync(join(repo, "a.txt"), "hello from explicit repo\n");
  sh("git", ["add", "."], repo);
  const { fakePath, dir: fakeDir } = makeFakeClaude({ result: "reviewed explicit repo", sessionId: "sess-explicit-repo" });
  const mcp = spawnMcp(envWith(fakePath, dataDir), pluginCwd);
  try {
    const res = await rpc(mcp, 1, "tools/call", {
      name: "cc_review",
      arguments: { repo_path: repo },
    });
    assert.match(textOf(res), /reviewed explicit repo/);
  } finally {
    mcp.kill();
    rmSync(dataDir, { recursive: true, force: true });
    rmSync(pluginCwd, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeDir, { recursive: true, force: true });
  }
});

test("repo tools use explicit repo_path for rescue/status/result/cancel when MCP cwd is not the repo", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "cc-data-"));
  const pluginCwd = mkdtempSync(join(tmpdir(), "cc-plugin-cwd-"));
  const repo = makeRepo();
  const streamEvents = [
    { type: "assistant_message", message: { role: "assistant", content: [{ type: "text", text: "working from explicit repo" }] } },
  ];
  const { fakePath, dir: fakeDir } = makeFakeClaude({ streamEvents, hang: true });
  const mcp = spawnMcp(envWith(fakePath, dataDir), pluginCwd);
  try {
    const start = await rpc(mcp, 1, "tools/call", {
      name: "cc_rescue",
      arguments: { task: "investigate from explicit repo", background: true, repo_path: repo },
    });
    const taskId = textOf(start).match(/task id: (cc-[^\s]+)/)[1];

    const status = await rpc(mcp, 2, "tools/call", {
      name: "cc_status",
      arguments: { repo_path: repo },
    });
    assert.match(textOf(status), new RegExp(taskId));

    let pollId = 3;
    const result = await pollUntil(
      () => rpc(mcp, pollId++, "tools/call", {
        name: "cc_result",
        arguments: { task_id: taskId, repo_path: repo },
      }),
      (res) => /working from explicit repo/.test(textOf(res)),
    );
    assert.match(textOf(result), /working from explicit repo/);

    const cancel = await rpc(mcp, pollId++, "tools/call", {
      name: "cc_cancel",
      arguments: { task_id: taskId, repo_path: repo },
    });
    assert.match(textOf(cancel), /Cancelled/);
  } finally {
    mcp.kill();
    rmSync(dataDir, { recursive: true, force: true });
    rmSync(pluginCwd, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeDir, { recursive: true, force: true });
  }
});

test("cc_transfer uses explicit repo_path when MCP cwd is not the repo", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "cc-data-"));
  const pluginCwd = mkdtempSync(join(tmpdir(), "cc-plugin-cwd-"));
  const repo = makeRepo();
  const source = join(dataDir, "codex-session.jsonl");
  writeFileSync(source, JSON.stringify({ role: "user", content: `continue work in ${repo}` }) + "\n");
  const { fakePath, dir: fakeDir } = makeFakeClaude({ result: "transferred", sessionId: "sess-transfer-1" });
  const mcp = spawnMcp(envWith(fakePath, dataDir), pluginCwd);
  try {
    const res = await rpc(mcp, 1, "tools/call", {
      name: "cc_transfer",
      arguments: { source, repo_path: repo },
    });
    assert.match(textOf(res), /claude --resume sess-transfer-1/);
  } finally {
    mcp.kill();
    rmSync(dataDir, { recursive: true, force: true });
    rmSync(pluginCwd, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeDir, { recursive: true, force: true });
  }
});

test("cc_rescue background spawns a detached job and cc_cancel stops it", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "cc-data-"));
  const repo = makeRepo();
  // fake claude that streams slowly so the job is still running when we cancel.
  const streamEvents = [
    { type: "assistant_message", message: { role: "assistant", content: [{ type: "text", text: "working…" }] } },
    // intentionally no `result` event; the process will hang until killed.
  ];
  const { fakePath, dir: fakeDir } = makeFakeClaude({ streamEvents, hang: true });
  const mcp = spawnMcp(envWith(fakePath, dataDir), repo);
  try {
    const start = await rpc(mcp, 1, "tools/call", {
      name: "cc_rescue",
      arguments: { task: "long investigation", background: true },
    });
    const stxt = textOf(start);
    assert.match(stxt, /Started rescue in the background/);
    const taskId = stxt.match(/task id: (cc-[^\s]+)/)[1];
    assert.ok(taskId, "no task id returned");

    const status = await rpc(mcp, 2, "tools/call", { name: "cc_status", arguments: {} });
    assert.match(textOf(status), new RegExp(taskId));
    assert.match(textOf(status), /running/);

    const cancel = await rpc(mcp, 3, "tools/call", { name: "cc_cancel", arguments: { task_id: taskId } });
    assert.match(textOf(cancel), /Cancelled/);

    const status2 = await rpc(mcp, 4, "tools/call", { name: "cc_status", arguments: {} });
    assert.match(textOf(status2), /cancelled/);
  } finally {
    mcp.kill();
    rmSync(dataDir, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeDir, { recursive: true, force: true });
  }
});

test("cc_rescue background marks completed jobs from stream-json result", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "cc-data-"));
  const repo = makeRepo();
  const { fakePath, dir: fakeDir } = makeFakeClaude({ result: "background done", sessionId: "sess-bg-1" });
  const mcp = spawnMcp(envWith(fakePath, dataDir), repo);
  try {
    const start = await rpc(mcp, 1, "tools/call", {
      name: "cc_rescue",
      arguments: { task: "quick background task", background: true },
    });
    const taskId = textOf(start).match(/task id: (cc-[^\s]+)/)[1];

    let pollId = 2;
    const status = await pollUntil(
      () => rpc(mcp, pollId++, "tools/call", { name: "cc_status", arguments: { task_id: taskId } }),
      (res) => /\[completed\]/.test(textOf(res)),
    );
    assert.match(textOf(status), /\[completed\]/);
    assert.match(textOf(status), /sid=sess-bg-1/);

    const result = await rpc(mcp, pollId++, "tools/call", { name: "cc_result", arguments: { task_id: taskId } });
    assert.match(textOf(result), /Job .* — rescue — completed/);
    assert.match(textOf(result), /background done/);
    assert.match(textOf(result), /Resume in Claude Code:  claude --resume sess-bg-1/);
  } finally {
    mcp.kill();
    rmSync(dataDir, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
    rmSync(fakeDir, { recursive: true, force: true });
  }
});
