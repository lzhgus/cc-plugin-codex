# Claude Code Companion for Codex

[English](../README.md) | [简体中文](README.zh-CN.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Português](README.pt.md)

在 Codex 里使用 Claude Code：做 code review，或者把任务委托给 Claude Code。

这是一个非官方 companion plugin。它不内置 Claude Code，而是调用你本机已经安装并登录的
`claude` CLI。

## 重要说明

Codex plugin 通过 `@cc`、自然语言，或者插件选择器调用。这个插件不会在 Codex 输入框里新增
插件专属的 slash command。如果你输入旧式 slash 命令时看到 "No commands"，不代表安装失败。
安装后请新开一个 Codex thread，然后用 `@cc`。

## 功能

- `@cc check setup`：检查 Claude Code 是否已安装并登录。
- `@cc review my uncommitted changes`：对当前未提交改动做只读 review。
- `@cc challenge this implementation against main`：做更有挑战性的设计和风险 review。
- `@cc investigate why tests are failing in the background`：把任务委托给 Claude Code。
- `@cc status`、`@cc result`、`@cc cancel`：查看、读取或取消后台任务。
- `@cc transfer this Codex session to Claude Code`：生成 Claude Code resume 命令。

底层 MCP 工具包括：`cc_setup`、`cc_review`、`cc_adversarial_review`、`cc_rescue`、
`cc_transfer`、`cc_status`、`cc_result`、`cc_cancel`。

## 要求

- Claude Code Pro/Max 订阅，或 Anthropic API key。
- Node.js 18.18 或更高版本。
- 支持 plugin 的 Codex CLI。
- 已安装并登录的 Claude Code CLI，也就是 `claude`。

## 安装

### 1. 安装 Claude Code

官方 quickstart 推荐原生安装：

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Windows PowerShell：

```powershell
irm https://claude.ai/install.ps1 | iex
```

Windows CMD：

```cmd
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
```

也可以用包管理器：

```bash
brew install --cask claude-code
winget install Anthropic.ClaudeCode
```

然后登录：

```bash
claude
```

按浏览器提示完成登录。也可以在 Claude Code 里用 `/login` 重新登录。

### 2. 安装这个 Codex plugin

添加 marketplace：

```bash
codex plugin marketplace add lzhgus/cc-plugin-codex
```

安装插件：

```bash
codex plugin add cc@cc-plugin-codex
```

安装后新开一个 Codex thread，然后输入：

```text
@cc check whether Claude Code is installed and authenticated
```

也可以在 shell 里确认 MCP server：

```bash
codex mcp list
```

你应该能看到 `claude-code` MCP server，以及 `cc_*` tools。

本地开发时可以从 repo checkout 安装：

```bash
codex plugin marketplace add .
codex plugin add cc@cc-plugin-codex
```

## Claude Code CI/CD

这个插件只需要本地 Claude Code CLI。不过 Claude Code 也有官方 CI/CD 集成。GitHub Actions
场景下，打开 Claude Code 后运行：

```text
/install-github-app
```

官方流程会安装 Claude GitHub App，并引导 repo admin 添加 GitHub Actions workflow 和 API key
secret。参考：

- https://code.claude.com/docs/en/quickstart
- https://code.claude.com/docs/en/github-actions

## 使用

```text
@cc check setup
@cc review my uncommitted changes
@cc review my branch against main
@cc challenge whether this caching and retry design is safe
@cc investigate why the tests started failing
@cc run a background rescue for the CI regression
@cc status
@cc result
@cc cancel the latest running job
@cc transfer this Codex session to Claude Code
```

Review 工具是只读的，不会修改文件。Rescue 任务会委托给 Claude Code，因此可以修改文件。
后台任务会返回 task id；用 `@cc status` 和 `@cc result` 查看进度和结果。

## 开发

```bash
node --check plugins/cc/scripts/claude-companion.mjs
node plugins/cc/scripts/claude-companion.mjs --tools
node plugins/cc/scripts/claude-companion.mjs --selftest
npm test
```

测试使用 `fake-claude` fixture，不会调用真实的 `claude`。

## License

Apache-2.0。见 [LICENSE](../LICENSE)。
