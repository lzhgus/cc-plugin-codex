# Claude Code Companion for Codex

[English](../README.md) | [简体中文](README.zh-CN.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Português](README.pt.md)

Codex の中から Claude Code を使い、コードレビューやタスクの委任を行うためのプラグインです。

これは非公式の companion plugin です。Claude Code 本体は同梱せず、ローカルにインストール
済みでログイン済みの `claude` CLI を利用します。

## 重要な呼び出し方法

Codex plugin は `@cc`、自然言語、またはプラグイン選択 UI から呼び出します。このプラグインは
Codex の入力欄にプラグイン専用 slash command を追加しません。古い slash 形式のコマンドで
"No commands" と表示されても、インストール失敗とは限りません。インストール後は新しい
Codex thread を開き、`@cc` を使ってください。

## 機能

- `@cc check setup`: Claude Code のインストール状態とログイン状態を確認します。
- `@cc review my uncommitted changes`: 未コミットの変更を読み取り専用でレビューします。
- `@cc challenge this implementation against main`: 設計やリスクをより批判的にレビューします。
- `@cc investigate why tests are failing in the background`: Claude Code に作業を委任します。
- `@cc status`, `@cc result`, `@cc cancel`: バックグラウンドジョブを確認、取得、キャンセルします。
- `@cc transfer this Codex session to Claude Code`: Claude Code の resume コマンドを作成します。

内部 MCP ツールは `cc_setup`, `cc_review`, `cc_adversarial_review`, `cc_rescue`,
`cc_transfer`, `cc_status`, `cc_result`, `cc_cancel` です。

## 要件

- Claude Code Pro/Max サブスクリプション、または Anthropic API key。
- Node.js 18.18 以上。
- plugin をサポートする Codex CLI。
- インストール済みでログイン済みの Claude Code CLI、つまり `claude`。

## インストール

### 1. Claude Code をインストール

公式 quickstart は native install を推奨しています。

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

代替パッケージマネージャ:

```bash
brew install --cask claude-code
winget install Anthropic.ClaudeCode
```

ログイン:

```bash
claude
```

ブラウザのログイン手順に従ってください。Claude Code 内で `/login` を使って再ログインする
こともできます。

### 2. Codex plugin をインストール

Marketplace を追加:

```bash
codex plugin marketplace add lzhgus/cc-plugin-codex
```

プラグインをインストール:

```bash
codex plugin add cc@cc-plugin-codex
```

インストール後、新しい Codex thread を開いて次のように依頼します。

```text
@cc check whether Claude Code is installed and authenticated
```

MCP server の確認:

```bash
codex mcp list
```

`claude-code` MCP server と `cc_*` tools が表示されるはずです。

ローカル開発用:

```bash
codex plugin marketplace add .
codex plugin add cc@cc-plugin-codex
```

## Claude Code CI/CD

このプラグイン自体に必要なのはローカル Claude Code CLI だけですが、Claude Code には公式の
CI/CD 連携もあります。GitHub Actions では Claude Code を開いて実行します。

```text
/install-github-app
```

公式セットアップは Claude GitHub App のインストール、GitHub Actions workflow、API key
secret の追加を案内します。参考:

- https://code.claude.com/docs/en/quickstart
- https://code.claude.com/docs/en/github-actions

## 使い方

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

Review ツールは読み取り専用です。Rescue は Claude Code に委任するためファイルを変更できます。
バックグラウンドジョブは task id を返し、`@cc status` と `@cc result` で確認します。

## 開発

```bash
node --check plugins/cc/scripts/claude-companion.mjs
node plugins/cc/scripts/claude-companion.mjs --tools
node plugins/cc/scripts/claude-companion.mjs --selftest
npm test
```

テストは `fake-claude` fixture を使うため、実際の `claude` は呼び出しません。

## License

Apache-2.0。詳しくは [LICENSE](../LICENSE) を参照してください。
