---
description: Check whether Claude Code is installed and authenticated. Also manages the optional review gate (advisory in Codex).
---

# Claude Code setup

Run a readiness check before using any other `cc:` tool. Call the `cc_setup` MCP tool with no arguments.

```
cc_setup()
```

Interpret the result for the user:

- If `claude installed: no`, tell them to install Claude Code from the official quickstart and then `/cc:setup` again:
  - macOS/Linux/WSL: `!curl -fsSL https://claude.ai/install.sh | bash`
  - Windows PowerShell: `!irm https://claude.ai/install.ps1 | iex`
- If `authenticated: no`, tell them to run `!claude login` (or set `ANTHROPIC_API_KEY`) and then `/cc:setup` again.
- Otherwise report the version and auth status.

## Review gate (optional)

Pass `--enable-review-gate` / `--disable-review-gate` to toggle the advisory review-gate flag:

```
cc_setup({ enable_review_gate: true })   // or disable_review_gate: true
```

Note: in Codex the review gate is advisory. A future revision may add a stop-time hook when Codex exposes one.

## `$ARGUMENTS`

`$ARGUMENTS` may contain `--enable-review-gate` or `--disable-review-gate`. Map them to the tool booleans and ignore anything else.
