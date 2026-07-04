---
description: Convert the current Codex session into a Claude Code session and print a `claude --resume <id>` command.
---

# Transfer Codex session to Claude Code

Create a Claude Code session seeded with the current Codex session transcript, then print a `claude --resume <session-id>` command so the user can continue that same context directly in Claude Code.

Use it when you started a debugging or implementation conversation in Codex and want to continue it in Claude Code.

## Flags

Parse `$ARGUMENTS`:

| Flag | Tool field |
|---|---|
| `--source <path>` | `source` (explicit Codex session JSONL path) |

## Examples

```bash
/cc:transfer
/cc:transfer --source ~/.codex/sessions/<session-id>.jsonl
```

Call:

```
cc_transfer({})
// or
cc_transfer({ source: "<path>" })
```

## Notes

- Transfer is **best-effort**: Codex and Claude Code use different session formats, so the Codex transcript is summarized into a seed prompt rather than losslessly imported.
- When `--source` is omitted, the tool uses the most recently modified Codex session that references this repository.