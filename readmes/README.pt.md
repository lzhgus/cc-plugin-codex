# Claude Code Companion for Codex

[English](../README.md) | [简体中文](README.zh-CN.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Português](README.pt.md)

Use o Claude Code dentro do Codex para revisar código ou delegar tarefas ao Claude Code.

Este é um companion plugin não oficial. Ele não inclui o Claude Code; usa o CLI local `claude` e a
autenticação do Claude Code que você já tem.

## Observação importante sobre uso

Plugins do Codex são chamados com `@cc`, linguagem natural ou pelo seletor de plugins. Este plugin
não adiciona comandos slash próprios ao compositor do Codex. Se um comando antigo em estilo slash
mostrar "No commands", a instalação ainda pode estar correta. Depois de instalar, abra um novo
thread no Codex e use `@cc`.

## Recursos

- `@cc check setup`: verifica se o Claude Code está instalado e autenticado.
- `@cc review my uncommitted changes`: executa uma revisão somente leitura.
- `@cc challenge this implementation against main`: executa uma revisão adversarial focada em riscos.
- `@cc investigate why tests are failing in the background`: delega uma tarefa ao Claude Code.
- `@cc status`, `@cc result`, `@cc cancel`: gerencia trabalhos em segundo plano.
- `@cc transfer this Codex session to Claude Code`: cria um comando de resume para o Claude Code.

As ferramentas MCP internas são `cc_setup`, `cc_review`, `cc_adversarial_review`, `cc_rescue`,
`cc_transfer`, `cc_status`, `cc_result` e `cc_cancel`.

## Requisitos

- Assinatura Claude Code Pro/Max ou uma Anthropic API key.
- Node.js 18.18 ou posterior.
- Codex CLI com suporte a plugins.
- Claude Code CLI instalado e autenticado como `claude`.

## Instalação

### 1. Instalar o Claude Code

O quickstart oficial recomenda a instalação nativa:

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

Alternativas com gerenciadores de pacotes:

```bash
brew install --cask claude-code
winget install Anthropic.ClaudeCode
```

Depois faça login:

```bash
claude
```

Siga o fluxo de login no navegador. Você também pode autenticar novamente dentro do Claude Code com
`/login`.

### 2. Instalar este plugin do Codex

Adicione o marketplace:

```bash
codex plugin marketplace add lzhgus/cc-plugin-codex
```

Instale o plugin:

```bash
codex plugin add cc@cc-plugin-codex
```

Depois da instalação, abra um novo thread no Codex e peça:

```text
@cc check whether Claude Code is installed and authenticated
```

Você também pode verificar o MCP server:

```bash
codex mcp list
```

Você deve ver o MCP server `claude-code` e as ferramentas `cc_*`.

Para desenvolvimento local a partir deste repositório:

```bash
codex plugin marketplace add .
codex plugin add cc@cc-plugin-codex
```

## Claude Code CI/CD

Este plugin só precisa do Claude Code CLI local, mas o Claude Code também tem integrações oficiais
de CI/CD. Para GitHub Actions, abra o Claude Code e execute:

```text
/install-github-app
```

A configuração oficial instala o Claude GitHub App e orienta administradores a adicionar workflows
do GitHub Actions e um secret com a API key. Referências:

- https://code.claude.com/docs/en/quickstart
- https://code.claude.com/docs/en/github-actions

## Uso

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

As revisões são somente leitura. As tarefas rescue são delegadas ao Claude Code e podem modificar
arquivos. Trabalhos em segundo plano retornam um task id; use `@cc status` e `@cc result` para
acompanhar o progresso e ver o resultado.

## Desenvolvimento

```bash
node --check plugins/cc/scripts/claude-companion.mjs
node plugins/cc/scripts/claude-companion.mjs --tools
node plugins/cc/scripts/claude-companion.mjs --selftest
npm test
```

Os testes usam um fixture `fake-claude`, então não chamam o `claude` real.

## License

Apache-2.0. Consulte [LICENSE](../LICENSE).
