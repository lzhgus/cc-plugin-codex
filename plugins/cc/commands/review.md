---
description: Run a read-only Claude Code code review of your current work. Supports --base <ref>, --background, --wait.
---

# Claude Code review

Run a normal read-only Claude Code review of the current work. It gives the same quality of review as running `/review` inside Claude Code directly.

Use it when you want:

- a review of your current uncommitted changes
- a review of your branch compared to a base branch like `main`

This command is read-only — Claude Code cannot modify files.

## Flags

Parse `$ARGUMENTS` and pass them to the `cc_review` MCP tool:

| Flag | Tool field |
|---|---|
| `--base <ref>` | `base` |
| `--background` | `background: true` |
| `--wait` | `wait: true` |

## Examples

```bash
/cc:review
/cc:review --base main
/cc:review --background
```

For the first example call:

```
cc_review({})
```

For `--base main --background`:

```
cc_review({ base: "main", background: true })
```

## Behavior

- With `--background`, the tool returns a task id immediately. Tell the user to check with `/cc:status` and read results with `/cc:result`.
- Without `--background`, the call blocks and returns the rendered review inline.

> Note: Code review — especially multi-file — can take a while. Prefer `--background` for non-trivial diffs.

This command does not take custom focus text. Use `/cc:adversarial-review` to challenge a specific decision or risk area.