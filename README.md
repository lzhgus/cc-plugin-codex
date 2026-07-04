# Claude Code Companion for Codex

[English](README.md) | [简体中文](readmes/README.zh-CN.md) | [한국어](readmes/README.ko.md) | [日本語](readmes/README.ja.md) | [Español](readmes/README.es.md) | [Português](readmes/README.pt.md)

Use Claude Code from inside Codex for code reviews or to delegate tasks to Claude Code.

This plugin is for Codex users who want an easy way to start using Claude Code from the workflow
they already have.

This is an unofficial companion plugin. It does not bundle Claude Code; it uses the local `claude`
CLI and your existing Claude Code authentication.

## What You Get

- `/cc:setup` checks that Claude Code is installed and authenticated
- `/cc:review` for a read-only Claude Code review
- `/cc:adversarial-review` for a steerable challenge review
- `/cc:rescue`, `/cc:transfer`, `/cc:status`, `/cc:result`, and `/cc:cancel` to delegate work, hand off
  sessions, and manage background jobs

The plugin exposes the same tools as the `claude-code` MCP server (`cc_setup`, `cc_review`,
`cc_adversarial_review`, `cc_rescue`, `cc_transfer`, `cc_status`, `cc_result`, `cc_cancel`).

## Requirements

- **Claude Code subscription (Pro/Max) or Anthropic API key.** Usage contributes to your Claude Code
  usage limits.
- **Node.js 18.18 or later**
- **Codex CLI** with plugin support (`codex plugin …`)
- **Claude Code CLI** installed and authenticated as `claude`

## Install

### 1. Install Claude Code

Claude Code is required because this plugin wraps your local `claude` CLI. The official Claude Code
quickstart recommends native install:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

For Windows PowerShell:

```powershell
irm https://claude.ai/install.ps1 | iex
```

For Windows CMD:

```cmd
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
```

Alternative package managers:

```bash
brew install --cask claude-code
winget install Anthropic.ClaudeCode
```

Then log in:

```bash
claude
```

Follow the browser login prompt. You can also re-authenticate from inside Claude Code with `/login`.

### 2. Install this Codex plugin

Add the marketplace in Codex:

```bash
codex plugin marketplace add lzhgus/cc-plugin-codex
```

Install the plugin:

```bash
codex plugin add cc@cc-plugin-codex
```

Then run:

```
/cc:setup
```

`/cc:setup` tells you whether Claude Code is ready. If `claude` is missing and npm is available,
it can offer to install it for you.

If Claude Code is installed but not logged in yet:

```bash
!claude login
```

After install you should see the `claude-code` MCP server under `codex mcp list` and the `cc_*`
tools available to Codex.

For local development from a checkout of this repo, use:

```bash
codex plugin marketplace add .
codex plugin add cc@cc-plugin-codex
```

### Claude Code CI/CD

This plugin only needs the local Claude Code CLI, but Claude Code also has official CI/CD
integrations. For GitHub Actions, open Claude Code and run:

```text
/install-github-app
```

The official setup installs the Claude GitHub App and walks repository admins through adding GitHub
Actions workflows and an API key secret. See:

- https://code.claude.com/docs/en/quickstart
- https://code.claude.com/docs/en/github-actions

## Usage

### `/cc:setup`

Checks whether Claude Code is installed and authenticated.

```bash
/cc:setup
/cc:setup --enable-review-gate
/cc:setup --disable-review-gate
```

> Note: in Codex the review gate is advisory. A future revision may add a stop-time hook if Codex
> exposes one.

### `/cc:review`

Runs a read-only Claude Code review on your current work. It gives the same quality of code review
as running `/review` inside Claude Code directly.

> [!NOTE]
> Code review — especially multi-file — can take a while. Run it in the background.

Use it when you want:

- a review of your current uncommitted changes
- a review of your branch compared to a base branch like `main`

Use `--base <ref>` for branch review. Supports `--wait` and `--background`. It is not steerable and
does not take custom focus text. Use `/cc:adversarial-review` to challenge a specific decision.

```bash
/cc:review
/cc:review --base main
/cc:review --background
```

Read-only: Claude Code cannot modify files. When backgrounded, check with `/cc:status` and cancel
with `/cc:cancel`.

### `/cc:adversarial-review`

Runs a **steerable** review that questions the chosen implementation and design. Use it to
pressure-test assumptions, tradeoffs, failure modes, and alternative approaches.

Same target selection as `/cc:review` (incl. `--base <ref>`), plus `--wait` and `--background`.
Unlike `/cc:review`, it takes free-text focus after the flags.

```bash
/cc:adversarial-review
/cc:adversarial-review --base main challenge whether this was the right caching and retry design
/cc:adversarial-review --background look for race conditions and question the chosen approach
```

Read-only. It does not fix code.

### `/cc:rescue`

Hands a task to Claude Code through the `cc_rescue` tool. Use it when you want Claude Code to
investigate a bug, try a fix, continue a previous Claude Code task, or take a faster/cheaper pass
with a smaller model.

Supports `--background`, `--wait`, `--resume`, `--fresh`, `--model`, and `--effort`.

```bash
/cc:rescue investigate why the tests started failing
/cc:rescue fix the failing test with the smallest safe patch
/cc:rescue --resume <session-id> apply the top fix from the last run
/cc:rescue --model haiku --effort medium investigate the flaky integration test
/cc:rescue --background investigate the regression
```

You can also just ask naturally: "Ask Claude Code to redesign the database connection to be more
resilient."

Notes:

- if you omit `--model`/`--effort`, Claude Code chooses its own defaults.
- `--model` accepts aliases: `fable`, `opus`, `sonnet`, `haiku`.
- to continue the latest rescue thread for this repo, run `/cc:status` to get a session id, then
  use `--resume <id>`.

### `/cc:transfer`

Creates a Claude Code session seeded with the current Codex session transcript and prints a
`claude --resume <session-id>` command.

```bash
/cc:transfer
/cc:transfer --source ~/.codex/sessions/<session-id>.jsonl
```

Transfer is **best-effort**: Codex and Claude Code use different session formats, so the Codex
transcript is summarized into a seed prompt rather than losslessly imported.

### `/cc:status`, `/cc:result`, `/cc:cancel`

```bash
/cc:status          # running + recent jobs
/cc:status <id>
/cc:result          # final output of latest job (+ claude --resume <id>)
/cc:result <id>
/cc:cancel          # cancel latest running job
/cc:cancel <id>
```

## Typical Flows

### Review before shipping

```bash
/cc:review
```

### Hand a problem to Claude Code

```bash
/cc:rescue investigate why the build is failing in CI
```

### Start something long-running

```bash
/cc:adversarial-review --background
/cc:rescue --background investigate the flaky test
```

Then check in with:

```bash
/cc:status
/cc:result
```

## Claude Code integration

The plugin wraps the locally installed `claude` CLI in headless mode (`claude -p …`). It uses the
global `claude` binary and your existing Claude Code login and config.

### Common configurations

To change the default model/effort used by the plugin, configure Claude Code via its own settings
or pass `--model` / `--effort` to `/cc:rescue`. The plugin honors your `~/.claude` config and
`CLAUDE_*` environment variables.

### Moving the work over to Claude Code

Delegated tasks and reviews also produce a Claude Code session id (see it via `/cc:result` or
`/cc:status`). Resume that run directly in Claude Code with:

```bash
claude --resume <session-id>
```

## FAQ

### Do I need a separate Claude account?

No. This plugin uses your local Claude Code login. If you are signed into Claude Code on this
machine, that account works immediately. If you only use Codex today, run `!claude login` (or set
`ANTHROPIC_API_KEY`) after installing Claude Code.

### Does the plugin use a separate Claude runtime?

No. It delegates through your local `claude` CLI on the same machine — same install, same auth,
same repo checkout, same machine-local environment.

### Can I keep using my current API key or base URL setup?

Yes. Because the plugin uses your local `claude` CLI, your existing sign-in method and config
apply.

## Development

```bash
node --check plugins/cc/scripts/claude-companion.mjs   # syntax check
node plugins/cc/scripts/claude-companion.mjs --tools   # dump tool list
node plugins/cc/scripts/claude-companion.mjs --selftest # installed? authed?
npm test                                                # unit + MCP smoke tests
```

Tests use a `fake-claude` fixture so they never call the real `claude` binary.

## License

Apache-2.0. See [LICENSE](./LICENSE).
