import { test } from "node:test";
import assert from "node:assert/strict";
import { buildArgs } from "../plugins/cc/scripts/lib/claude.mjs";

test("buildArgs adds --verbose for stream-json output", () => {
  const args = buildArgs({ prompt: "review this", outputFormat: "stream-json" });

  assert.equal(args.includes("--verbose"), true);
});

test("buildArgs does not add --verbose for json output", () => {
  const args = buildArgs({ prompt: "review this", outputFormat: "json" });

  assert.equal(args.includes("--verbose"), false);
});
