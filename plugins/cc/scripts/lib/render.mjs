// Render Claude Code output for display inside Codex.

// Render a parsed `claude -p --output-format json` result object into markdown.
export function renderResult(parsed) {
  if (!parsed) return "(no output)";
  if (typeof parsed === "string") return parsed;
  const text = parsed.result || parsed.text || "";
  const sid = parsed.session_id;
  const cost = typeof parsed.total_cost_usd === "number" ? parsed.total_cost_usd : null;
  const parts = [];
  if (parsed.is_error) parts.push("> ⚠️ Claude reported an error for this run.\n");
  if (text) parts.push(text);
  const meta = [];
  if (sid) meta.push(`session: \`${sid}\``);
  if (cost !== null) meta.push(`cost: $${cost.toFixed(4)}`);
  if (meta.length) parts.push(`\n— ${meta.join(" · ")}`);
  return parts.join("\n").trim() || "(no output)";
}

// Best-effort parse of `--output-format stream-json` log lines into a readable
// summary. We scan for assistant message text deltas and the final result.
export function renderStreamLog(logText) {
  if (!logText) return { text: "(no log yet)", session_id: null, done: false };
  const lines = logText.split("\n").filter(Boolean);
  let lastAssistant = "";
  let session_id = null;
  let done = false;
  let isError = false;
  let finalText = "";
  for (const line of lines) {
    let evt;
    try { evt = JSON.parse(line); } catch { continue; }
    if (!evt || typeof evt !== "object") continue;
    if (evt.session_id && !session_id) session_id = evt.session_id;
    if (evt.type === "result") {
      done = true;
      isError = !!evt.is_error;
      finalText = evt.result || "";
      if (evt.session_id) session_id = evt.session_id;
    } else if (evt.type === "assistant_message" && evt.message?.content) {
      const txt = extractText(evt.message.content);
      if (txt) lastAssistant = txt;
    } else if (evt.type === "assistant" && evt.message?.content) {
      const txt = extractText(evt.message.content);
      if (txt) lastAssistant = txt;
    } else if (typeof evt.delta === "string") {
      lastAssistant += evt.delta;
    }
  }
  const text = finalText || lastAssistant || "";
  return { text: text || "(no output yet)", session_id, done, isError };
}

function extractText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((b) => b && (b.type === "text" || typeof b === "string"))
    .map((b) => (typeof b === "string" ? b : b.text || ""))
    .join("");
}

// Read the last N lines of a log file.
export function tailLog(text, maxLines = 400) {
  if (!text) return "";
  const lines = text.split("\n");
  if (lines.length <= maxLines) return text;
  return lines.slice(-maxLines).join("\n");
}