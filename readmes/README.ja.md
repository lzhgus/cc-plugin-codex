# Codex 用 Claude Code Companion

[English](../README.md) | [简体中文](README.zh-CN.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Português](README.pt.md)

Codex から Claude Code を呼び出し、コードレビューや作業の委任、セッションの引き継ぎを行うためのプラグインです。

これは非公式の companion plugin です。Claude Code 本体は同梱せず、ローカルにインストール済みでログイン済みの `claude` CLI を使用します。

## できること

- `/cc:setup`: Claude Code のインストール状態とログイン状態を確認します。
- `/cc:review`: 現在の変更を読み取り専用で Claude Code にレビューさせます。
- `/cc:adversarial-review`: 設計やリスクをより批判的にレビューします。
- `/cc:rescue`, `/cc:transfer`, `/cc:status`, `/cc:result`, `/cc:cancel`: タスク委任、セッション移行、バックグラウンドジョブ管理を行います。

MCP ツールとして `cc_setup`, `cc_review`, `cc_adversarial_review`, `cc_rescue`, `cc_transfer`, `cc_status`, `cc_result`, `cc_cancel` も公開します。

## 要件

- Claude Code のサブスクリプション（Pro/Max など）または Anthropic API key。
- Node.js 18.18 以降。
- plugin 対応の Codex CLI。
- インストール済みで認証済みの Claude Code CLI。ターミナルで `claude` を実行できる必要があります。

## インストール

### 1. Claude Code をインストールする

このプラグインはローカルの `claude` CLI に依存します。Claude Code 公式 quickstart では native install が推奨されています。

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Windows PowerShell:

```powershell
irm https://claude.ai/install.ps1 | iex
```

Windows CMD:

```cmd
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
```

パッケージマネージャーも利用できます。

```bash
brew install --cask claude-code
winget install Anthropic.ClaudeCode
```

インストール後にログインします。

```bash
claude
```

ブラウザのログイン手順に従ってください。後から Claude Code セッション内で `/login` を実行して再認証することもできます。

### 2. Codex プラグインをインストールする

marketplace を追加します。

```bash
codex plugin marketplace add lzhgus/cc-plugin-codex
```

プラグインをインストールします。

```bash
codex plugin add cc@cc-plugin-codex
```

続いて Codex で実行します。

```text
/cc:setup
```

インストール後、`codex mcp list` に `claude-code` MCP server が表示され、Codex で `cc_*` ツールを使えるはずです。

ローカル checkout から開発用にインストールする場合:

```bash
codex plugin marketplace add .
codex plugin add cc@cc-plugin-codex
```

## Claude Code CI/CD

このプラグイン自体に必要なのはローカルの Claude Code CLI だけです。一方で Claude Code には公式 CI/CD 統合もあります。GitHub Actions のクイックセットアップは、Claude Code ターミナルで次を実行します。

```text
/install-github-app
```

公式セットアップでは Claude GitHub App のインストール、GitHub Actions workflow の追加、API key secret の設定をリポジトリ管理者向けに案内します。

参考:

- https://code.claude.com/docs/en/quickstart
- https://code.claude.com/docs/en/github-actions

## よく使うコマンド

```bash
/cc:review
/cc:review --background
/cc:adversarial-review --base main challenge the caching and retry design
/cc:rescue investigate why the tests started failing
/cc:status
/cc:result
```

## 仕組み

このプラグインは `claude -p ...` のような headless mode でローカル Claude Code CLI を実行します。そのため、同じマシン上の Claude Code インストール、認証状態、設定、リポジトリ checkout をそのまま使います。

## 開発時の検証

```bash
npm test
npm run check
node plugins/cc/scripts/claude-companion.mjs --tools
node plugins/cc/scripts/claude-companion.mjs --selftest
```

テストは fake Claude fixture を使うため、実際の Claude Code は呼び出しません。

## License

Apache-2.0。詳細は [LICENSE](../LICENSE) を参照してください。
