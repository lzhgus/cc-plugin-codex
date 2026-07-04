---
name: claude-prompting
description: How to phrase tasks and reviews when delegating to Claude Code from Codex via the cc_* tools. Read before composing a non-trivial cc_rescue task or review focus.
---

# Prompting Claude Code from Codex

## Overview

When you delegate to Claude Code through `cc_rescue` or aim a `cc_review` / `cc_adversarial_review`, the quality of the result depends on how you phrase the task. Claude Code is a full agent with its own tools (Read, Edit, Bash, …), so give it a goal and constraints, not a script.

## Principles

- **State the goal, then the constraints.** "Fix the flaky login test. Don't touch auth.go; the bug is in the test's retry timing."
- **One task at a time.** Don't bundle five asks into one rescue. If the user asks for several things, sequence them and say so.
- **Point at files when you know them.** "The regression is likely in `pkg/repo/cache.go`." Claude can search, but a pointer saves time.
- **Ask for verification.** Add "run the project's tests before declaring done" for fixes. Claude Code does this by default via its own instructions, but restating it helps.
- **Prefer background for long work.** Pass `background: true` and tell the user the task id.

## For reviews

- `cc_review` needs no focus text — just the target (uncommitted, or `base`).
- `cc_adversarial_review` benefits from a concrete `focus`: name the risk area. "Look for race conditions in the new cache and question the chosen eviction policy" beats "review the code".

## Antipatterns

See [[references/prompt-antipatterns]] for things to avoid, and [[references/prompt-recipes]] for copy-pasteable task shapes.