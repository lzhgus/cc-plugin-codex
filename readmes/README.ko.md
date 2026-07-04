# Claude Code Companion for Codex

[English](../README.md) | [简体中文](README.zh-CN.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Português](README.pt.md)

Codex 안에서 Claude Code를 사용해 코드 리뷰를 하거나 작업을 Claude Code에 위임합니다.

이 플러그인은 비공식 companion plugin입니다. Claude Code를 포함하지 않으며, 로컬에 설치되고
로그인된 `claude` CLI를 사용합니다.

## 중요한 호출 방식

Codex 플러그인은 `@cc`, 자연어 요청, 또는 플러그인 선택기를 통해 호출합니다. 이 플러그인은
Codex 입력창에 플러그인 전용 slash command를 추가하지 않습니다. 예전 slash 방식의 명령을
입력했을 때 "No commands"가 보여도 설치가 반드시 실패한 것은 아닙니다. 설치 후 새 Codex
thread를 열고 `@cc`를 사용하세요.

## 기능

- `@cc check setup`: Claude Code 설치 및 로그인 상태를 확인합니다.
- `@cc review my uncommitted changes`: 현재 미커밋 변경 사항을 읽기 전용으로 리뷰합니다.
- `@cc challenge this implementation against main`: 설계와 위험 요소를 더 비판적으로 검토합니다.
- `@cc investigate why tests are failing in the background`: 작업을 Claude Code에 위임합니다.
- `@cc status`, `@cc result`, `@cc cancel`: 백그라운드 작업을 확인, 조회, 취소합니다.
- `@cc transfer this Codex session to Claude Code`: Claude Code resume 명령을 만듭니다.

내부 MCP 도구는 `cc_setup`, `cc_review`, `cc_adversarial_review`, `cc_rescue`, `cc_transfer`,
`cc_status`, `cc_result`, `cc_cancel`입니다.

## 요구 사항

- Claude Code Pro/Max 구독 또는 Anthropic API key.
- Node.js 18.18 이상.
- 플러그인을 지원하는 Codex CLI.
- 설치 및 로그인된 Claude Code CLI, 즉 `claude`.

## 설치

### 1. Claude Code 설치

공식 quickstart는 native install을 권장합니다.

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

대체 패키지 매니저:

```bash
brew install --cask claude-code
winget install Anthropic.ClaudeCode
```

로그인:

```bash
claude
```

브라우저 로그인 안내를 따르세요. Claude Code 안에서 `/login`으로 다시 로그인할 수도 있습니다.

### 2. Codex 플러그인 설치

Marketplace 추가:

```bash
codex plugin marketplace add lzhgus/cc-plugin-codex
```

플러그인 설치:

```bash
codex plugin add cc@cc-plugin-codex
```

설치 후 새 Codex thread를 열고 다음처럼 요청하세요.

```text
@cc check whether Claude Code is installed and authenticated
```

MCP server 확인:

```bash
codex mcp list
```

`claude-code` MCP server와 `cc_*` tools가 보여야 합니다.

Repo 도구가 git repository를 찾을 수 없다고 하면, 해당 프로젝트에서 새 Codex thread를 열고
`@cc`를 다시 호출하세요. MCP server 자체는 플러그인 캐시 디렉터리에서 실행되며, Codex가
현재 프로젝트 경로를 `repo_path`로 도구에 전달합니다.

로컬 개발용 설치:

```bash
codex plugin marketplace add .
codex plugin add cc@cc-plugin-codex
```

## Claude Code CI/CD

이 플러그인은 로컬 Claude Code CLI만 필요합니다. Claude Code의 공식 CI/CD 통합도 사용할 수
있습니다. GitHub Actions의 경우 Claude Code를 열고 실행하세요.

```text
/install-github-app
```

공식 설정은 Claude GitHub App 설치와 GitHub Actions workflow, API key secret 추가를 안내합니다.
참고:

- https://code.claude.com/docs/en/quickstart
- https://code.claude.com/docs/en/github-actions

## 사용 예시

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

Review 도구는 읽기 전용입니다. Rescue 작업은 Claude Code에 위임되므로 파일을 수정할 수
있습니다. 백그라운드 작업은 task id를 반환하며, `@cc status`와 `@cc result`로 확인합니다.

## 개발

```bash
node --check plugins/cc/scripts/claude-companion.mjs
node plugins/cc/scripts/claude-companion.mjs --tools
node plugins/cc/scripts/claude-companion.mjs --selftest
npm test
```

테스트는 `fake-claude` fixture를 사용하므로 실제 `claude`를 호출하지 않습니다.

## License

Apache-2.0. [LICENSE](../LICENSE)를 참고하세요.
