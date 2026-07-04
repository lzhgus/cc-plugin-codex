import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const PLUGIN = join(HERE, "..", "plugins", "cc");
const ROOT = join(HERE, "..");
const PUBLIC_DOCS = [
  "README.md",
  "readmes/README.zh-CN.md",
  "readmes/README.ko.md",
  "readmes/README.ja.md",
  "readmes/README.es.md",
  "readmes/README.pt.md",
];

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (k) fm[k] = v;
  }
  return fm;
}

test("skills have name + description frontmatter", () => {
  const skillsDir = join(PLUGIN, "skills");
  const skills = readdirSync(skillsDir).filter((d) => existsSync(join(skillsDir, d, "SKILL.md")));
  assert.ok(skills.length >= 2, "expected at least 2 skills");
  for (const s of skills) {
    const fm = parseFrontmatter(readFileSync(join(skillsDir, s, "SKILL.md"), "utf8"));
    assert.ok(fm?.name, `skill ${s} missing name`);
    assert.ok(fm?.description, `skill ${s} missing description`);
  }
});

test("plugin.json is valid JSON with mcpServers + skills", () => {
  const pj = JSON.parse(readFileSync(join(PLUGIN, ".codex-plugin", "plugin.json"), "utf8"));
  assert.equal(pj.name, "cc");
  assert.equal(pj.mcpServers, "./.mcp.json");
  assert.equal(pj.skills, "./skills/");
  assert.equal(pj.commands, undefined);
  assert.ok(pj.interface?.displayName);
});

test("public docs invoke the plugin through @cc instead of /cc:* commands", () => {
  for (const doc of PUBLIC_DOCS) {
    const text = readFileSync(join(ROOT, doc), "utf8");
    assert.doesNotMatch(text, /\/cc:/, `${doc} still documents unsupported /cc:* commands`);
    assert.match(text, /@cc/, `${doc} should show @cc invocation`);
  }
});

test(".mcp.json declares the claude-code stdio server", () => {
  const m = JSON.parse(readFileSync(join(PLUGIN, ".mcp.json"), "utf8"));
  assert.ok(m.mcpServers?.["claude-code"]);
  assert.equal(m.mcpServers["claude-code"].command, "node");
});

test("marketplace.json declares the cc plugin", () => {
  const m = JSON.parse(readFileSync(join(HERE, "..", ".agents", "plugins", "marketplace.json"), "utf8"));
  assert.equal(m.name, "cc-plugin-codex");
  assert.equal(m.plugins[0].name, "cc");
  assert.equal(m.plugins[0].source.path, "./plugins/cc");
});

test("package check script points at existing plugin scripts", () => {
  const pkg = JSON.parse(readFileSync(join(HERE, "..", "package.json"), "utf8"));
  assert.match(pkg.scripts?.check || "", /plugins\/cc\/scripts\/claude-companion\.mjs/);
  assert.ok(existsSync(join(HERE, "..", "plugins", "cc", "scripts", "claude-companion.mjs")));
  assert.ok(existsSync(join(HERE, "..", "plugins", "cc", "scripts", "lib")));
});
