# Claude Code Companion for Codex

[English](README.md) | [简体中文](readmes/README.zh-CN.md) | [한국어](readmes/README.ko.md) | [日本語](readmes/README.ja.md) | [Español](readmes/README.es.md) | [Português](readmes/README.pt.md)

Use Claude Code from inside Codex for code reviews or to delegate tasks to Claude Code.

This is an unofficial companion plugin. It does not bundle Claude Code; it wraps your local
`claude` CLI and uses your existing Claude Code authentication.

## Important Invocation Note

Codex plugins are invoked through `@cc`, natural language, or the plugin picker. This plugin does
not add plugin-specific slash commands to the Codex composer. If typing an old slash-style command
shows "No commands", the install may still be fine. Start a new thread after installing and ask
Codex to use `@cc`.

## What You Get

- `@cc check setup` checks whether Claude Code is installed and authenticated.
- `@cc review my uncommitted changes` runs a read-only Claude Code review.
- `@cc challenge this implementation against main` runs a steerable adversarial review.
- `@cc investigate why tests are failing in the background` delegates work to Claude Code.
- `@cc status`, `@cc result`, and `@cc cancel` manage background jobs.
- `@cc transfer this Codex session to Claude Code` creates a Claude Code resume command.

The plugin exposes the `claude-code` MCP tools: `cc_setup`, `cc_review`,
`cc_adversarial_review`, `cc_rescue`, `cc_transfer`, `cc_status`, `cc_result`, and `cc_cancel`.

## Requirements

- **Claude Code subscription (Pro/Max) or Anthropic API key.** Usage contributes to your Claude
  Code usage limits.
- **Node.js 18.18 or later**
- **Codex CLI** with plugin support (`codex plugin ...`)
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

Follow the browser login prompt. You can also re-authenticate from inside Claude Code with
`/login`.

### 2. Install this Codex plugin

Add the marketplace in Codex:

```bash
codex plugin marketplace add lzhgus/cc-plugin-codex
```

Install the plugin:

```bash
codex plugin add cc@cc-plugin-codex
```

After installing, start a new Codex thread and ask:

```text
@cc check whether Claude Code is installed and authenticated
```

You can also verify the MCP server from a shell:

```bash
codex mcp list
```

You should see the `claude-code` MCP server and the `cc_*` tools available to Codex.

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

### Setup

```text
@cc check setup
@cc check setup and enable the advisory review gate
@cc check setup and disable the advisory review gate
```

Setup reports whether `claude` is installed, the detected version, auth status, and the advisory
review gate setting.

### Review

```text
@cc review my uncommitted changes
@cc review my branch against main
@cc review my changes in the background
```

Reviews are read-only. Claude Code cannot modify files through the review tools.

### Adversarial Review

```text
@cc challenge whether this caching and retry design is safe
@cc run an adversarial review against main focused on race conditions
```

Use this when you want Claude Code to pressure-test assumptions, tradeoffs, failure modes, and
alternative approaches.

### Rescue

```text
@cc investigate why the tests started failing
@cc fix the failing test with the smallest safe patch
@cc continue the previous Claude Code session and apply the top fix
@cc run a background rescue for the CI regression
```

Rescue tasks can edit files because they delegate the work to Claude Code.

### Status, Result, Cancel

```text
@cc status
@cc result
@cc cancel the latest running job
@cc result for task <task-id>
```

Background tasks produce a task id. Use status/result to monitor them and to get the Claude Code
session id for direct resume.

### Transfer

```text
@cc transfer this Codex session to Claude Code
```

Transfer is best-effort: Codex and Claude Code use different session formats, so the Codex
transcript is summarized into a seed prompt rather than losslessly imported.

## Claude Code Integration

The plugin wraps the locally installed `claude` CLI in headless mode (`claude -p ...`). It uses the
global `claude` binary and your existing Claude Code login and config.

To change the default model/effort used by delegated tasks, configure Claude Code via its own
settings or ask `@cc` for a specific model/effort. The plugin honors your `~/.claude` config and
`CLAUDE_*` environment variables.

Delegated tasks and reviews also produce a Claude Code session id. Resume that run directly in
Claude Code with:

```bash
claude --resume <session-id>
```

## FAQ

### Do I need a separate Claude account?

No. This plugin uses your local Claude Code login. If you are signed into Claude Code on this
machine, that account works immediately. If you only use Codex today, run `claude login` or set
`ANTHROPIC_API_KEY` after installing Claude Code.

### Does the plugin use a separate Claude runtime?

No. It delegates through your local `claude` CLI on the same machine: same install, same auth, same
repo checkout, same machine-local environment.

### Can I keep using my current API key or base URL setup?

Yes. Because the plugin uses your local `claude` CLI, your existing sign-in method and config
apply.

## Development

```bash
node --check plugins/cc/scripts/claude-companion.mjs    # syntax check
node plugins/cc/scripts/claude-companion.mjs --tools    # dump tool list
node plugins/cc/scripts/claude-companion.mjs --selftest # installed? authed?
npm test                                                # unit + MCP smoke tests
```

Tests use a `fake-claude` fixture so they never call the real `claude` binary.

## License

Apache-2.0. See [LICENSE](./LICENSE).
