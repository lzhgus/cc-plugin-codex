---
description: Run a steerable, adversarial Claude Code review that challenges the chosen design. Supports --base <ref>, --background, --wait, plus free-text focus.
---

# Claude Code adversarial review

Run a **steerable** review that questions the chosen implementation and design. Use it to pressure-test assumptions, tradeoffs, failure modes, and whether a different approach would have been safer or simpler.

This command is read-only — Claude Code cannot modify files.

## Flags + focus

Parse `$ARGUMENTS`:

| Flag | Tool field |
|---|---|
| `--base <ref>` | `base` |
| `--background` | `background: true` |
| `--wait` | `wait: true` |

Any remaining text after the flags is the **focus** — pass it as `focus`.

## Examples

```bash
/cc:adversarial-review
/cc:adversarial-review --base main challenge whether this was the right caching and retry design
/cc:adversarial-review --background look for race conditions and question the chosen approach
```

For the second example call:

```
cc_adversarial_review({ base: "main", focus: "challenge whether this was the right caching and retry design" })
```

## Behavior

- Same target selection as `/cc:review` (uncommitted vs `--base`).
- With `--background`, returns a task id; follow up with `/cc:status` and `/cc:result`.
- Without `--background`, blocks and returns the rendered review inline.