---
description: Hand a task to Claude Code through the cc_rescue tool. Supports --model, --effort, --background, --wait, --resume, --fresh.
---

# Claude Code rescue

Hand a task to Claude Code. Use it when you want Claude Code to:

- investigate a bug
- try a fix
- continue a previous Claude Code task
- take a faster or cheaper pass with a smaller model

## Flags

Parse `$ARGUMENTS`:

| Flag | Tool field |
|---|---|
| `--model <m>` | `model` (aliases: `fable`, `opus`, `sonnet`, `haiku`) |
| `--effort <l>` | `effort` (`low`/`medium`/`high`/`xhigh`/`max`) |
| `--background` | `background: true` |
| `--wait` | `wait: true` |
| `--resume <id>` | `resume` (a prior Claude Code session id) |
| `--fresh` | `fresh: true` |

Everything after the flags is the **task** — pass it as `task`.

## Examples

```bash
/cc:rescue investigate why the tests started failing
/cc:rescue fix the failing test with the smallest safe patch
/cc:rescue --resume <session-id> apply the top fix from the last run
/cc:rescue --model haiku --effort medium investigate the flaky integration test
/cc:rescue --background investigate the regression
```

For the first example call:

```
cc_rescue({ task: "investigate why the tests started failing" })
```

For `--background investigate the regression`:

```
cc_rescue({ task: "investigate the regression", background: true })
```

## Behavior

- If you omit `--model`/`--effort`, Claude Code chooses its own defaults.
- If you omit both `--resume` and `--fresh`, the tool starts a fresh session. To continue the latest rescue thread for this repo, first run `/cc:status` to get a session id, then use `--resume <id>`.
- With `--background`, the tool returns a task id immediately. Follow up with `/cc:status` and `/cc:result`; cancel with `/cc:cancel`.

> Note: Depending on the task and model, rescue can run a long time. Prefer `--background` for non-trivial work.

You can also just ask naturally: "Ask Claude Code to redesign the database connection to be more resilient." Codex should route that to `cc_rescue`.