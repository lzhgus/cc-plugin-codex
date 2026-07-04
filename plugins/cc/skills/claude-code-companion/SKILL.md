---
name: claude-code-companion
description: How to call the Claude Code companion MCP tools from Codex — review, adversarial review, rescue, transfer, status/result/cancel, setup. Read before delegating to Claude Code or running a Claude Code review.
---

# Claude Code companion

## Overview

This plugin wraps the locally installed `claude` CLI (headless mode) and exposes it to Codex as MCP tools under the `claude-code` server. Use these tools when the user wants Claude Code to review code, take on a task, or continue work started in Codex.

The plugin uses the same `claude` install, login, and config the user already has. It does not bundle Claude Code.

## Prerequisites

- `claude` is on PATH and logged in (OAuth or `ANTHROPIC_API_KEY`).
- Run `cc_setup` once before any other tool. If it reports `claude installed: no` or `authenticated: no`, stop and tell the user how to fix it (`!curl -fsSL https://claude.ai/install.sh | bash` on macOS/Linux/WSL, `!irm https://claude.ai/install.ps1 | iex` on Windows PowerShell, and/or `!claude login`).

## Tools

| Tool | Use when |
|---|---|
| `cc_setup` | Readiness check. Always first. |
| `cc_review` | Read-only review of current uncommitted changes or a branch vs `--base`. |
| `cc_adversarial_review` | Read-only steerable review that challenges the design; accepts `focus`. |
| `cc_rescue` | Delegate a task (bug, fix, investigation, follow-up) to Claude Code. Can mutate files. |
| `cc_transfer` | Hand the current Codex session transcript to Claude Code; get a `claude --resume <id>` command. |
| `cc_status` | List running/recent background jobs for this repo. |
| `cc_result` | Read the stored output of a finished job + its Claude session id. |
| `cc_cancel` | Kill a running background job. |

## When to use which

- **Review the diff** → `cc_review`. For a branch review, pass `base: "main"` (or another ref).
- **Challenge the approach** → `cc_adversarial_review` with `focus` describing the concern (auth, data loss, race conditions, rollback, etc.).
- **Hand off a task** → `cc_rescue`. Pass the task as `task`. Prefer `background: true` for anything non-trivial, then surface progress via `cc_status` / `cc_result`.
- **Continue a prior run** → `cc_rescue` with `resume: "<session-id>"` (get the id from `cc_status` / `cc_result`). Use `fresh: true` to force a new session.
- **Move the conversation to Claude Code** → `cc_transfer`.

## Required workflow

**Follow these steps in order. Do not skip.**

### Step 1: Confirm readiness

Call `cc_setup`. If it is not ready, tell the user exactly what to run and stop.

### Step 2: Pick the tool from the table above

Do not call `cc_rescue` for something that is really a review — reviews are read-only. Do not call `cc_review` to make changes — it cannot.

### Step 3: Long-running work goes to the background

For `cc_review` and `cc_rescue`, prefer `background: true` when the diff is non-trivial or the task may take more than a few seconds. Tell the user the task id, then offer to check progress through `@cc status` and `@cc result`.

### Step 4: Report faithfully

Surface the tool's rendered text to the user. If a job failed, says so. If it is still running, say so. Do not invent output.

## Model + effort

`cc_rescue` accepts `model` (aliases: `fable`, `opus`, `sonnet`, `haiku`) and `effort` (`low`/`medium`/`high`/`xhigh`/`max`). If the user does not specify, omit both and let Claude Code choose its defaults. Use `haiku` / `low` for quick mechanical checks; `opus` / `xhigh` for hard debugging.

## Read-only enforcement

`cc_review` and `cc_adversarial_review` restrict the Claude session to read-only tools. They cannot edit files. Rely on this — do not add instructions asking the review to apply fixes. If the user wants fixes, use `cc_rescue`.
