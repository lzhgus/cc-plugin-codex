import { test } from "node:test";
import assert from "node:assert/strict";
import { renderResult, renderStreamLog, tailLog } from "../plugins/cc/scripts/lib/render.mjs";

test("renderResult renders text + meta", () => {
  const out = renderResult({ result: "All good", session_id: "sess-1", total_cost_usd: 0.001, is_error: false });
  assert.match(out, /All good/);
  assert.match(out, /session: `sess-1`/);
  assert.match(out, /cost: \$0\.0010/);
});

test("renderResult flags errors", () => {
  const out = renderResult({ result: "boom", is_error: true });
  assert.match(out, /Claude reported an error/);
});

test("renderStreamLog extracts result from a stream-json log", () => {
  const log = [
    JSON.stringify({ type: "assistant_message", message: { role: "assistant", content: [{ type: "text", text: "thinking…" }] } }),
    JSON.stringify({ type: "result", result: "final answer", session_id: "sess-2", is_error: false }),
  ].join("\n");
  const { text, session_id, done, isError } = renderStreamLog(log);
  assert.equal(text, "final answer");
  assert.equal(session_id, "sess-2");
  assert.equal(done, true);
  assert.equal(isError, false);
});

test("renderStreamLog falls back to last assistant text when no result event", () => {
  const log = JSON.stringify({ type: "assistant_message", message: { role: "assistant", content: [{ type: "text", text: "partial" }] } });
  const { text, done } = renderStreamLog(log);
  assert.equal(text, "partial");
  assert.equal(done, false);
});

test("renderStreamLog handles empty input", () => {
  const { text } = renderStreamLog("");
  assert.equal(text, "(no log yet)");
});

test("tailLog truncates to last N lines", () => {
  const big = Array.from({ length: 100 }, (_, i) => `line ${i}`).join("\n");
  const out = tailLog(big, 10);
  assert.match(out, /line 99/);
  assert.doesNotMatch(out, /line 5\n/);
});