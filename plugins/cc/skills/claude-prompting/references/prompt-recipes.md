# Prompt recipes for delegating to Claude Code

Copy-pasteable shapes for `cc_rescue` tasks and `cc_adversarial_review` focus. Adapt the specifics.

## Rescue: investigate a failure

```
Task: Investigate why <test or behavior> is failing.
Start by reproducing it: <command>. Read <file> and the relevant callers.
Do not change code yet — report the root cause and the smallest patch that fixes it, then apply it and re-run <command>.
```

## Rescue: smallest safe patch

```
Task: Apply the smallest safe patch that fixes <symptom> without changing behavior elsewhere.
Constraint: do not refactor. Add a test if one is missing. Run `npm test` before declaring done.
```

## Rescue: cheaper/faster pass

```
Task: <mechanical task, e.g. rename X to Y across the repo and update imports>.
Use the smallest model. Do not refactor beyond the rename.
```
Pass `model: "haiku"`, `effort: "low"`.

## Adversarial review: race conditions

```
Focus: Look for race conditions in <area>. Question the chosen locking/concurrency approach; identify interleavings that break invariants.
```

## Adversarial review: data loss / rollback

```
Focus: Pressure-test rollback and data loss. If this change is reverted after partial rollout, what state is left behind? Is the migration reversible?
```

## Adversarial review: auth / security

```
Focus: Challenge the auth and input-handling in <area>. Look for injection, missing authorization, and secret leakage.
```

## Review: branch vs base

```
cc_review({ base: "main" })
```

## Review: uncommitted only

```
cc_review({})
```