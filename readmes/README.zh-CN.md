# Codex 的 Claude Code Companion

[English](../README.md) | [简体中文](README.zh-CN.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Português](README.pt.md)

在 Codex 里调用 Claude Code：让 Claude Code 做代码审查、执行委托任务，或把当前工作转交到 Claude Code 继续。

这是一个非官方 companion plugin。它不会捆绑 Claude Code，只会调用你本机已经安装并登录的 `claude` CLI。

## 你会得到什么

- `/cc:setup`：检查 Claude Code 是否已安装并登录。
- `/cc:review`：对当前改动做只读 Claude Code review。
- `/cc:adversarial-review`：做更有挑战性的设计/风险 review。
- `/cc:rescue`、`/cc:transfer`、`/cc:status`、`/cc:result`、`/cc:cancel`：委托任务、转交会话、管理后台任务。

插件也暴露同名 MCP 工具：`cc_setup`、`cc_review`、`cc_adversarial_review`、`cc_rescue`、`cc_transfer`、`cc_status`、`cc_result`、`cc_cancel`。

## 前置要求

- Claude Code 订阅（Pro/Max 等）或 Anthropic API key。
- Node.js 18.18 或更新版本。
- 支持 plugin 的 Codex CLI。
- 已安装并登录的 Claude Code CLI，也就是终端里可以运行 `claude`。

## 安装

### 1. 安装 Claude Code

本插件依赖本机 `claude` CLI。根据 Claude Code 官方 quickstart，推荐使用 native install：

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

也可以使用包管理器：

```bash
brew install --cask claude-code
winget install Anthropic.ClaudeCode
```

安装后登录：

```bash
claude
```

按照浏览器里的登录提示完成登录。之后也可以在 Claude Code 会话里用 `/login` 重新登录。

### 2. 安装 Codex 插件

添加 marketplace：

```bash
codex plugin marketplace add lzhgus/cc-plugin-codex
```

安装插件：

```bash
codex plugin add cc@cc-plugin-codex
```

然后在 Codex 中运行：

```text
/cc:setup
```

安装成功后，`codex mcp list` 应该能看到 `claude-code` MCP server，Codex 里也应该能使用 `cc_*` 工具。

本地开发安装：

```bash
codex plugin marketplace add .
codex plugin add cc@cc-plugin-codex
```

## Claude Code CI/CD

本插件只需要本机 Claude Code CLI。不过 Claude Code 官方也提供 CI/CD 集成。GitHub Actions 的快速设置方式是在 Claude Code 终端里运行：

```text
/install-github-app
```

官方流程会安装 Claude GitHub App，并引导仓库管理员添加 GitHub Actions workflow 和 API key secret。

参考：

- https://code.claude.com/docs/en/quickstart
- https://code.claude.com/docs/en/github-actions

## 常用方式

```bash
/cc:review
/cc:review --background
/cc:adversarial-review --base main 重点看缓存和重试设计有没有问题
/cc:rescue investigate why the tests started failing
/cc:status
/cc:result
```

## 工作原理

插件通过本地 `claude` CLI 的 headless 模式运行 Claude Code，例如 `claude -p ...`。因此它使用同一台机器上的同一份 Claude Code 安装、登录状态、配置和代码仓库。

## 开发验证

```bash
npm test
npm run check
node plugins/cc/scripts/claude-companion.mjs --tools
node plugins/cc/scripts/claude-companion.mjs --selftest
```

测试使用 fake Claude fixture，不会调用真实 Claude Code。

## License

Apache-2.0。详见 [LICENSE](../LICENSE)。
