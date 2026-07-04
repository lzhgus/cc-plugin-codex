import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, tokenize, normalizeModel } from "../plugins/cc/scripts/lib/args.mjs";

test("tokenize respects quotes", () => {
  assert.deepEqual(tokenize('a "b c" d'), ["a", "b c", "d"]);
  assert.deepEqual(tokenize("--base main 'fix the bug'"), ["--base", "main", "fix the bug"]);
});

test("parseArgs extracts flags and positional text", () => {
  const a = parseArgs("--base main investigate the regression");
  assert.equal(a.base, "main");
  assert.equal(a.positionalText, "investigate the regression");
});

test("parseArgs handles booleans", () => {
  const a = parseArgs("review --background --wait");
  assert.equal(a.background, true);
  assert.equal(a.wait, true);
  assert.equal(a.positionalText, "review");
});

test("parseArgs captures value flags", () => {
  const a = parseArgs("--model haiku --effort medium --resume sess-123 do thing");
  assert.equal(a.model, "haiku");
  assert.equal(a.effort, "medium");
  assert.equal(a.resume, "sess-123");
  assert.equal(a.positionalText, "do thing");
});

test("parseArgs --fresh and review-gate toggles", () => {
  const a = parseArgs("--fresh --enable-review-gate");
  assert.equal(a.fresh, true);
  assert.equal(a.enableReviewGate, true);
});

test("normalizeModel passes through aliases, maps default to undefined", () => {
  assert.equal(normalizeModel("fable"), "fable");
  assert.equal(normalizeModel("Opus"), "opus");
  assert.equal(normalizeModel("default"), undefined);
  assert.equal(normalizeModel(""), undefined);
  assert.equal(normalizeModel(undefined), undefined);
});