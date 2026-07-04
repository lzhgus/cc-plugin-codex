# Codex용 Claude Code Companion

[English](../README.md) | [简体中文](README.zh-CN.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Português](README.pt.md)

Codex 안에서 Claude Code를 호출해 코드 리뷰를 실행하거나 작업을 Claude Code에 위임할 수 있습니다.

이 플러그인은 비공식 companion plugin입니다. Claude Code를 함께 배포하지 않으며, 로컬에 설치되고 로그인된 `claude` CLI를 사용합니다.

## 제공 기능

- `/cc:setup`: Claude Code 설치 및 인증 상태를 확인합니다.
- `/cc:review`: 현재 변경 사항에 대해 읽기 전용 Claude Code 리뷰를 실행합니다.
- `/cc:adversarial-review`: 설계와 위험 요소를 더 강하게 검토합니다.
- `/cc:rescue`, `/cc:transfer`, `/cc:status`, `/cc:result`, `/cc:cancel`: 작업 위임, 세션 이전, 백그라운드 작업 관리를 제공합니다.

MCP 도구도 함께 노출됩니다: `cc_setup`, `cc_review`, `cc_adversarial_review`, `cc_rescue`, `cc_transfer`, `cc_status`, `cc_result`, `cc_cancel`.

## 요구 사항

- Claude Code 구독(Pro/Max 등) 또는 Anthropic API key.
- Node.js 18.18 이상.
- plugin을 지원하는 Codex CLI.
- 설치 및 로그인된 Claude Code CLI. 터미널에서 `claude`를 실행할 수 있어야 합니다.

## 설치

### 1. Claude Code 설치

이 플러그인은 로컬 `claude` CLI에 의존합니다. Claude Code 공식 quickstart는 native install을 권장합니다.

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

패키지 매니저를 사용할 수도 있습니다.

```bash
brew install --cask claude-code
winget install Anthropic.ClaudeCode
```

설치 후 로그인합니다.

```bash
claude
```

브라우저 로그인 안내를 따르세요. 나중에 Claude Code 세션 안에서 `/login`으로 다시 인증할 수도 있습니다.

### 2. Codex 플러그인 설치

marketplace를 추가합니다.

```bash
codex plugin marketplace add lzhgus/cc-plugin-codex
```

플러그인을 설치합니다.

```bash
codex plugin add cc@cc-plugin-codex
```

그 다음 Codex에서 실행합니다.

```text
/cc:setup
```

설치가 끝나면 `codex mcp list`에서 `claude-code` MCP server가 보이고, Codex에서 `cc_*` 도구를 사용할 수 있어야 합니다.

로컬 checkout에서 개발용으로 설치할 때는 다음을 사용합니다.

```bash
codex plugin marketplace add .
codex plugin add cc@cc-plugin-codex
```

## Claude Code CI/CD

이 플러그인은 로컬 Claude Code CLI만 필요합니다. 다만 Claude Code는 공식 CI/CD 통합도 제공합니다. GitHub Actions 빠른 설정은 Claude Code 터미널에서 다음 명령을 실행합니다.

```text
/install-github-app
```

공식 설정은 Claude GitHub App 설치와 GitHub Actions workflow 및 API key secret 추가 과정을 저장소 관리자에게 안내합니다.

참고:

- https://code.claude.com/docs/en/quickstart
- https://code.claude.com/docs/en/github-actions

## 일반적인 사용

```bash
/cc:review
/cc:review --background
/cc:adversarial-review --base main challenge the caching and retry design
/cc:rescue investigate why the tests started failing
/cc:status
/cc:result
```

## 작동 방식

플러그인은 `claude -p ...` 같은 headless 모드로 로컬 Claude Code CLI를 실행합니다. 따라서 같은 머신의 Claude Code 설치, 인증 상태, 설정, 저장소 checkout을 그대로 사용합니다.

## 개발 검증

```bash
npm test
npm run check
node plugins/cc/scripts/claude-companion.mjs --tools
node plugins/cc/scripts/claude-companion.mjs --selftest
```

테스트는 fake Claude fixture를 사용하므로 실제 Claude Code를 호출하지 않습니다.

## License

Apache-2.0. [LICENSE](../LICENSE)를 참고하세요.
