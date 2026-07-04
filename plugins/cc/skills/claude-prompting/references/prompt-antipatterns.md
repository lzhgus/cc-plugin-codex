# Antipatterns when prompting Claude Code from Codex

Things to avoid when composing a `cc_rescue` task or review focus.

## Vague goals

❌ "Make it better."
✅ "Reduce p95 latency of `GET /search` below 200ms by adding a read-through cache for `terms`."

## Bundled tasks

❌ "Fix the bug, add tests, refactor the module, and write a migration."
✅ Sequence three rescues. Run them one at a time; check `cc_status` between them.

## Over-constraining the toolchain

❌ "Run `sed -i ...` then `git commit -m ...`."
✅ State the outcome: "Replace `Foo` with `Bar` across `src/`, update imports, and commit with message 'Rename Foo→Bar'." Let Claude Code choose tools.

## Asking a review to apply fixes

❌ Passing `focus: "fix all the issues you find."` to `cc_adversarial_review`.
✅ Reviews are read-only. To apply fixes, take the review output and run a `cc_rescue`.

## Ignoring background for long work

❌ Blocking on `cc_rescue` for a 10-minute investigation.
✅ `background: true`, then `/cc:status` and `/cc:result`.

## Inventing output

❌ Summarizing a job as "done" without calling `cc_result`.
✅ Call `cc_result` and surface its text. If it failed, say it failed.

## Resuming the wrong session

❌ `resume: "latest"`.
✅ Get a real session id from `cc_status` / `cc_result` and pass that. Use `fresh: true` to start clean.