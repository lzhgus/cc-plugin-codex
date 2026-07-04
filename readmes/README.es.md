# Claude Code Companion para Codex

[English](../README.md) | [简体中文](README.zh-CN.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Português](README.pt.md)

Usa Claude Code desde Codex para revisar código, delegar tareas o transferir una sesión de trabajo a Claude Code.

Este es un companion plugin no oficial. No incluye Claude Code; usa el CLI local `claude` que ya esté instalado y autenticado en tu máquina.

## Qué incluye

- `/cc:setup`: comprueba si Claude Code está instalado y autenticado.
- `/cc:review`: ejecuta una revisión de Claude Code en modo solo lectura.
- `/cc:adversarial-review`: ejecuta una revisión más crítica sobre diseño, riesgos y supuestos.
- `/cc:rescue`, `/cc:transfer`, `/cc:status`, `/cc:result`, `/cc:cancel`: delega tareas, transfiere sesiones y administra trabajos en segundo plano.

También expone las herramientas MCP `cc_setup`, `cc_review`, `cc_adversarial_review`, `cc_rescue`, `cc_transfer`, `cc_status`, `cc_result` y `cc_cancel`.

## Requisitos

- Suscripción a Claude Code (Pro/Max, etc.) o una Anthropic API key.
- Node.js 18.18 o posterior.
- Codex CLI con soporte para plugins.
- Claude Code CLI instalado y autenticado. El comando `claude` debe funcionar en la terminal.

## Instalación

### 1. Instalar Claude Code

Este plugin depende del CLI local `claude`. El quickstart oficial de Claude Code recomienda native install:

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

También puedes usar gestores de paquetes:

```bash
brew install --cask claude-code
winget install Anthropic.ClaudeCode
```

Después inicia sesión:

```bash
claude
```

Sigue el flujo de autenticación en el navegador. También puedes volver a autenticarte dentro de Claude Code con `/login`.

### 2. Instalar este plugin de Codex

Agrega el marketplace:

```bash
codex plugin marketplace add lzhgus/cc-plugin-codex
```

Instala el plugin:

```bash
codex plugin add cc@cc-plugin-codex
```

Luego ejecuta en Codex:

```text
/cc:setup
```

Después de instalar, `codex mcp list` debería mostrar el MCP server `claude-code`, y Codex debería tener disponibles las herramientas `cc_*`.

Para desarrollo local desde un checkout:

```bash
codex plugin marketplace add .
codex plugin add cc@cc-plugin-codex
```

## Claude Code CI/CD

Este plugin solo necesita el Claude Code CLI local. Aun así, Claude Code también ofrece integraciones oficiales de CI/CD. Para configurar GitHub Actions rápidamente, abre Claude Code y ejecuta:

```text
/install-github-app
```

El flujo oficial instala la Claude GitHub App y guía a los administradores del repositorio para agregar workflows de GitHub Actions y un secreto con la API key.

Referencias:

- https://code.claude.com/docs/en/quickstart
- https://code.claude.com/docs/en/github-actions

## Uso habitual

```bash
/cc:review
/cc:review --background
/cc:adversarial-review --base main challenge the caching and retry design
/cc:rescue investigate why the tests started failing
/cc:status
/cc:result
```

## Cómo funciona

El plugin ejecuta el Claude Code CLI local en modo headless, por ejemplo `claude -p ...`. Por eso usa la misma instalación, autenticación, configuración y copia del repositorio que ya usas en la máquina.

## Desarrollo y verificación

```bash
npm test
npm run check
node plugins/cc/scripts/claude-companion.mjs --tools
node plugins/cc/scripts/claude-companion.mjs --selftest
```

Las pruebas usan un fake Claude fixture, así que no llaman al Claude Code real.

## License

Apache-2.0. Consulta [LICENSE](../LICENSE).
