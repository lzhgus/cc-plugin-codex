// Prompt templates for review, adversarial review, and rescue.

const REPO_CONTEXT = (repoRoot) =>
  repoRoot ? `Repository root: ${repoRoot}\n\n` : "";

// Standard code review prompt. Read-only by construction (the caller restricts
// the claude session to read-only tools).
export function reviewPrompt({ diff, stat, base, repoRoot }) {
  const scope = base
    ? `Reviewing the changes on this branch compared to its merge base with \`${base}\`.`
    : `Reviewing the uncommitted changes (staged + unstaged) versus HEAD.`;
  return `You are a senior code reviewer. ${scope}

${REPO_CONTEXT(repoRoot)}Inspect the diff below and the surrounding code in the repository as needed (you have read-only tools: Read, Glob, Grep, and read-only git). Do not modify any files.

Focus on:
- correctness bugs, regressions, and edge cases
- security issues (auth, injection, secrets, unsafe data handling)
- error handling and resource cleanup
- tests: are the changes adequately covered? are tests correct?
- readability and maintainability regressions
- anything that would block merging

Output a concise, structured review:
1. **Summary** — one or two sentences on the overall state.
2. **Blockers** — numbered, each with file:line, what's wrong, and a concrete fix.
3. **Concerns** — non-blocking issues worth addressing.
4. **Nits** — minor polish.
5. **Looks good** — what's done well, briefly.

If there is genuinely nothing to review (empty diff), say so and stop.

\`\`\`diff-stat
${stat || "(no changes)"}
\`\`\`

\`\`\`diff
${diff || "(no changes)"}
\`\`\`
`;
}

// Adversarial / steerable review. `focus` is free-text the user supplied.
export function adversarialReviewPrompt({ diff, stat, base, focus, repoRoot }) {
  const scope = base
    ? `challenging the changes on this branch vs merge base with \`${base}\``
    : `challenging the uncommitted changes vs HEAD`;
  const focusBlock = focus
    ? `\n\nUser focus:\n${focus}\n`
    : "\n\nNo specific focus given; challenge the design broadly.\n";
  return `You are an adversarial senior reviewer whose job is to ${scope}. Question the chosen implementation and design rather than just reading the code. Look for: wrong assumptions, risky tradeoffs, hidden failure modes, simpler or safer alternatives, and anything that would be hard to undo or roll back. Pressure-test areas like auth, data loss, rollback, race conditions, and reliability.${focusBlock}

${REPO_CONTEXT(repoRoot)}You have read-only tools (Read, Glob, Grep, read-only git). Do not modify any files.

Structure your output:
1. **Thesis** — what is the change trying to do, and is it the right approach?
2. **Challenge** — numbered list of concrete challenges, each with the risk and a sharper alternative.
3. **Failure modes** — specific inputs/states that break the change.
4. **Verdict** — ship as-is / address concerns / rethink.

\`\`\`diff-stat
${stat || "(no changes)"}
\`\`\`

\`\`\`diff
${diff || "(no changes)"}
\`\`\`
`;
}

// Rescue prompt. Mostly the user's task verbatim, with light framing so Claude
// knows it is being delegated to from another agent.
export function rescuePrompt({ task, repoRoot, resume }) {
  const ctx = repoRoot ? `Working in repository: ${repoRoot}\n` : "";
  const cont = resume ? `Continuing a previous Claude Code session (${resume}).\n` : "";
  return `${cont}${ctx}

A task is being delegated to you from Codex. Investigate and act on it. Make minimal, safe, correct changes; run the project's checks/tests before declaring done; report what you changed and why.

Task:
${task}
`;
}