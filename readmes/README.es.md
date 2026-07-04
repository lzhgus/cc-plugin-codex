# Claude Code Companion for Codex

[English](../README.md) | [简体中文](README.zh-CN.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Português](README.pt.md)

Usa Claude Code desde Codex para revisar código o delegar tareas a Claude Code.

Este es un companion plugin no oficial. No incluye Claude Code; usa tu CLI local `claude` y la
autenticación de Claude Code que ya tengas configurada.

## Nota importante sobre el uso

Los plugins de Codex se invocan con `@cc`, lenguaje natural o el selector de plugins. Este plugin
no agrega comandos slash propios al compositor de Codex. Si al escribir un comando antiguo de estilo
slash ves "No commands", la instalación puede estar bien. Después de instalar, abre un thread nuevo
de Codex y usa `@cc`.

## Funciones

- `@cc check setup`: comprueba si Claude Code está instalado y autenticado.
- `@cc review my uncommitted changes`: ejecuta una revisión de solo lectura.
- `@cc challenge this implementation against main`: ejecuta una revisión adversarial y orientada a riesgos.
- `@cc investigate why tests are failing in the background`: delega una tarea a Claude Code.
- `@cc status`, `@cc result`, `@cc cancel`: gestiona trabajos en segundo plano.
- `@cc transfer this Codex session to Claude Code`: crea un comando de resume para Claude Code.

Las herramientas MCP internas son `cc_setup`, `cc_review`, `cc_adversarial_review`, `cc_rescue`,
`cc_transfer`, `cc_status`, `cc_result` y `cc_cancel`.

## Requisitos

- Suscripción Claude Code Pro/Max o una Anthropic API key.
- Node.js 18.18 o posterior.
- Codex CLI con soporte para plugins.
- Claude Code CLI instalado y autenticado como `claude`.

## Instalación

### 1. Instalar Claude Code

El quickstart oficial recomienda la instalación nativa:

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

Alternativas con gestores de paquetes:

```bash
brew install --cask claude-code
winget install Anthropic.ClaudeCode
```

Luego inicia sesión:

```bash
claude
```

Sigue el flujo de login en el navegador. También puedes volver a autenticarte dentro de Claude Code
con `/login`.

### 2. Instalar este plugin de Codex

Agrega el marketplace:

```bash
codex plugin marketplace add lzhgus/cc-plugin-codex
```

Instala el plugin:

```bash
codex plugin add cc@cc-plugin-codex
```

Después de instalar, abre un thread nuevo de Codex y pide:

```text
@cc check whether Claude Code is installed and authenticated
```

También puedes comprobar el MCP server:

```bash
codex mcp list
```

Deberías ver el MCP server `claude-code` y las herramientas `cc_*`.

Si una herramienta de repo dice que no puede resolver un git repository, abre un thread nuevo de
Codex dentro del proyecto y vuelve a invocar `@cc`. El MCP server se ejecuta desde la caché del
plugin; Codex pasa la ruta del proyecto a la herramienta como `repo_path`.

Para desarrollo local desde este repositorio:

```bash
codex plugin marketplace add .
codex plugin add cc@cc-plugin-codex
```

## Claude Code CI/CD

Este plugin solo necesita el Claude Code CLI local, pero Claude Code también tiene integraciones
oficiales de CI/CD. Para GitHub Actions, abre Claude Code y ejecuta:

```text
/install-github-app
```

La configuración oficial instala la Claude GitHub App y guía a los administradores para agregar
workflows de GitHub Actions y un secret con la API key. Referencias:

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

Las revisiones son de solo lectura. Las tareas rescue se delegan a Claude Code y pueden modificar
archivos. Los trabajos en segundo plano devuelven un task id; usa `@cc status` y `@cc result` para
ver el progreso y el resultado.

## Desarrollo

```bash
node --check plugins/cc/scripts/claude-companion.mjs
node plugins/cc/scripts/claude-companion.mjs --tools
node plugins/cc/scripts/claude-companion.mjs --selftest
npm test
```

Las pruebas usan un fixture `fake-claude`, así que no llaman al `claude` real.

## License

Apache-2.0. Consulta [LICENSE](../LICENSE).
