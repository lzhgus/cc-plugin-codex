# Claude Code Companion para Codex

[English](../README.md) | [简体中文](README.zh-CN.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Português](README.pt.md)

Use o Claude Code dentro do Codex para revisar código, delegar tarefas ou transferir uma sessão de trabalho para o Claude Code.

Este é um companion plugin não oficial. Ele não inclui o Claude Code; usa o CLI local `claude` já instalado e autenticado na sua máquina.

## O que você recebe

- `/cc:setup`: verifica se o Claude Code está instalado e autenticado.
- `/cc:review`: executa uma revisão do Claude Code em modo somente leitura.
- `/cc:adversarial-review`: executa uma revisão mais crítica sobre design, riscos e pressupostos.
- `/cc:rescue`, `/cc:transfer`, `/cc:status`, `/cc:result`, `/cc:cancel`: delega tarefas, transfere sessões e gerencia jobs em segundo plano.

O plugin também expõe as ferramentas MCP `cc_setup`, `cc_review`, `cc_adversarial_review`, `cc_rescue`, `cc_transfer`, `cc_status`, `cc_result` e `cc_cancel`.

## Requisitos

- Assinatura do Claude Code (Pro/Max etc.) ou uma Anthropic API key.
- Node.js 18.18 ou mais recente.
- Codex CLI com suporte a plugins.
- Claude Code CLI instalado e autenticado. O comando `claude` deve funcionar no terminal.

## Instalação

### 1. Instalar o Claude Code

Este plugin depende do CLI local `claude`. O quickstart oficial do Claude Code recomenda native install:

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

Também é possível usar gerenciadores de pacotes:

```bash
brew install --cask claude-code
winget install Anthropic.ClaudeCode
```

Depois faça login:

```bash
claude
```

Siga o fluxo de autenticação no navegador. Você também pode se autenticar novamente dentro do Claude Code com `/login`.

### 2. Instalar este plugin do Codex

Adicione o marketplace:

```bash
codex plugin marketplace add lzhgus/cc-plugin-codex
```

Instale o plugin:

```bash
codex plugin add cc@cc-plugin-codex
```

Depois execute no Codex:

```text
/cc:setup
```

Após a instalação, `codex mcp list` deve mostrar o MCP server `claude-code`, e as ferramentas `cc_*` devem estar disponíveis no Codex.

Para desenvolvimento local a partir de um checkout:

```bash
codex plugin marketplace add .
codex plugin add cc@cc-plugin-codex
```

## Claude Code CI/CD

Este plugin precisa apenas do Claude Code CLI local. Ainda assim, o Claude Code também oferece integrações oficiais de CI/CD. Para configurar GitHub Actions rapidamente, abra o Claude Code e execute:

```text
/install-github-app
```

O fluxo oficial instala o Claude GitHub App e orienta administradores do repositório a adicionar workflows do GitHub Actions e um segredo com a API key.

Referências:

- https://code.claude.com/docs/en/quickstart
- https://code.claude.com/docs/en/github-actions

## Uso comum

```bash
/cc:review
/cc:review --background
/cc:adversarial-review --base main challenge the caching and retry design
/cc:rescue investigate why the tests started failing
/cc:status
/cc:result
```

## Como funciona

O plugin executa o Claude Code CLI local em modo headless, por exemplo `claude -p ...`. Por isso ele usa a mesma instalação, autenticação, configuração e checkout do repositório que você já tem nessa máquina.

## Desenvolvimento e verificação

```bash
npm test
npm run check
node plugins/cc/scripts/claude-companion.mjs --tools
node plugins/cc/scripts/claude-companion.mjs --selftest
```

Os testes usam um fake Claude fixture, então não chamam o Claude Code real.

## License

Apache-2.0. Consulte [LICENSE](../LICENSE).
