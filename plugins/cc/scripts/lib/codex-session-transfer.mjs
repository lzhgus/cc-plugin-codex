// Best-effort conversion of a Codex session transcript into a seed prompt
// for a new Claude Code session.
//
// Codex and Claude Code have different session formats; we do not attempt a
// lossless import. Instead we summarize the user/assistant turns into a
// readable transcript and ask Claude to continue the work. This mirrors the
// spirit of the original plugin's `claude-session-transfer.mjs` (which goes
// the other direction) but is intentionally simpler.
import { readFileSync } from "node:fs";

// Parse a Codex session JSONL into a list of { role, text } turns.
export function readCodexSession(sessionPath) {
  const raw = readFileSync(sessionPath, "utf8");
  const turns = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let evt;
    try { evt = JSON.parse(line); } catch { continue; }
    const turn = extractTurn(evt);
    if (turn) turns.push(turn);
  }
  return turns;
}

function extractTurn(evt) {
  if (!evt || typeof evt !== "object") return null;
  // Codex session entries vary by version; tolerate several shapes.
  const role = evt.role || evt.type || (evt.message && evt.message.role);
  const content = evt.content || evt.text || (evt.message && evt.message.content);
  const text = stringifyContent(content) || evt.value || "";
  if (!text) return null;
  const r = String(role || "").toLowerCase();
  if (r.includes("user") || r.includes("human") || r === "message") {
    return { role: "user", text };
  }
  if (r.includes("assistant") || r.includes("agent") || r.includes("codex")) {
    return { role: "assistant", text };
  }
  // Fallback: keep unknown roles as context but mark them.
  return { role: "note", text };
}

function stringifyContent(content) {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map(stringifyBlock).filter(Boolean).join("\n");
  }
  if (typeof content === "object") return stringifyBlock(content);
  return String(content);
}

function stringifyBlock(block) {
  if (!block) return "";
  if (typeof block === "string") return block;
  if (typeof block.text === "string") return block.text;
  if (typeof block.content === "string") return block.content;
  if (Array.isArray(block.content)) return block.content.map(stringifyBlock).join("\n");
  if (block.type === "text" && block.text) return block.text;
  return "";
}

// Build the seed prompt to start a new Claude Code session from a Codex
// transcript. Caps the transcript length to keep the first turn manageable.
export function buildSeedPrompt(turns, { maxChars = 12000 } = {}) {
  const rendered = turns
    .map((t) => {
      const tag = t.role === "user" ? "User" : t.role === "assistant" ? "Codex" : "Note";
      return `### ${tag}\n${t.text}`;
    })
    .join("\n\n");
  let trimmed = rendered;
  if (trimmed.length > maxChars) {
    trimmed = `${rendered.slice(0, maxChars)}\n\n[... transcript truncated ...]`;
  }
  return `You are continuing work that was started in Codex. Below is a transcript of that session. Read it, then carry on the task: pick up where Codex left off, ask for clarification only if a goal is genuinely ambiguous, and make minimal, safe, correct changes.

# Codex transcript

${trimmed}

# Your job

Continue the work above. Summarize what you understand the goal to be, then proceed. Make minimal, safe, correct changes; run the project's checks/tests before declaring done; report what you changed and why.`;
}

export function transferSummary(sessionPath) {
  const turns = readCodexSession(sessionPath);
  return {
    turns,
    seed: buildSeedPrompt(turns),
    count: turns.length,
  };
}