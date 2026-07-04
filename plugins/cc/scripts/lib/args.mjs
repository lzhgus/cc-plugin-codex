// Shared argument parsing for cc companion commands and tools.
//
// Commands receive the user's free-form argument string (Codex `$ARGUMENTS`)
// and the MCP tools receive structured JSON, but both routes funnel through
// `parseArgs` so flag handling stays in one place.

const BOOL_FLAGS = new Set(["--wait", "--background", "--fresh", "--enable-review-gate", "--disable-review-gate"]);
const VALUE_FLAGS = new Set(["--base", "--model", "--effort", "--resume", "--source"]);

// Tokenize a string into args, respecting simple quoting. We avoid heavy
// shell-parsing dependencies; flags here are simple enough.
export function tokenize(input = "") {
  const out = [];
  let cur = "";
  let quote = null;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === " " || ch === "\t" || ch === "\n") {
      if (cur) out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur) out.push(cur);
  return out;
}

// Parse `input` into a structured object:
//   { base, model, effort, resume, source, wait, background, fresh,
//     enableReviewGate, disableReviewGate, positional: string }
export function parseArgs(input = "") {
  const tokens = Array.isArray(input) ? input : tokenize(input);
  const result = {
    base: undefined,
    model: undefined,
    effort: undefined,
    resume: undefined,
    source: undefined,
    wait: false,
    background: false,
    fresh: false,
    enableReviewGate: false,
    disableReviewGate: false,
    positional: [],
  };
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const next = tokens[i + 1];
    if (BOOL_FLAGS.has(tok)) {
      const key = flagToKey(tok);
      result[key] = true;
    } else if (VALUE_FLAGS.has(tok)) {
      if (next === undefined || next.startsWith("--")) {
        // Flag with no value; ignore.
        continue;
      }
      result[flagToKey(tok)] = next;
      i++;
    } else {
      result.positional.push(tok);
    }
  }
  result.positionalText = result.positional.join(" ").trim();
  return result;
}

function flagToKey(flag) {
  switch (flag) {
    case "--base": return "base";
    case "--model": return "model";
    case "--effort": return "effort";
    case "--resume": return "resume";
    case "--source": return "source";
    case "--wait": return "wait";
    case "--background": return "background";
    case "--fresh": return "fresh";
    case "--enable-review-gate": return "enableReviewGate";
    case "--disable-review-gate": return "disableReviewGate";
    default: return undefined;
  }
}

// Normalize a model alias. Claude accepts aliases directly (fable/opus/sonnet/haiku),
// so this is mostly a passthrough with a couple of conveniences.
export function normalizeModel(model) {
  if (!model) return undefined;
  const m = String(model).toLowerCase().trim();
  if (m === "claude" || m === "default") return undefined;
  return m;
}