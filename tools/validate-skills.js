#!/usr/bin/env node

/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Validates the agent skills that carry this repo's task workflows.
 *
 * Each assistant reads skills only from its own directory: IBM Bob from
 * `.bob/skills/`, Claude Code from `.claude/skills/`. Neither reads a shared
 * location, so the tree is stored twice — `.bob/skills/` is canonical (most
 * contributors here work in Bob) and `.claude/skills/` is a byte-identical
 * generated mirror. Both sit at the same directory depth, so relative links
 * inside a skill resolve the same way in either copy. This script checks:
 *
 * 1. Mirror identity — every tree holds the same files, byte for byte.
 * 2. Skill shape — every SKILL.md has frontmatter whose `name` matches its
 *    directory, plus a non-empty `description` (the field both harnesses use to
 *    decide when a skill applies).
 * 3. Link resolution — every relative link and backtick file path in a `caic-*`
 *    skill resolves on disk. These live outside the AGENTS.md link graph that
 *    tools/validate-agents-docs.js crawls, so nothing else would catch a typo.
 * 4. Fallback pointer — .github/copilot-instructions.md still links every
 *    caic-* skill. Bob and Claude Code load skills on their own, so AGENTS.md
 *    stays out of it; Copilot does not, and that file is its way in.
 *
 * Run with --fix to regenerate the mirror from the canonical tree.
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..");
const CANONICAL_DIR = ".bob/skills";
const MIRROR_DIRS = [".claude/skills"];
const FALLBACK_POINTER_FILE = ".github/copilot-instructions.md";

// Skills this repo owns. The vendored carbon-builder skill is mirrored and
// shape-checked like any other, but its internal links belong to its upstream
// author, so they are not ours to lint.
const OWNED_SKILL_PREFIX = "caic-";

const fix = process.argv.includes("--fix");

let errors = 0;

function error(file, message) {
  console.error(`❌ ERROR in ${file}: ${message}`);
  errors++;
}

function info(message) {
  console.log(`ℹ️  ${message}`);
}

// Every file under dir, as paths relative to it, sorted for stable comparison.
function listFiles(dir) {
  const root = path.join(REPO_ROOT, dir);
  if (!fs.existsSync(root)) {
    return [];
  }

  const found = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        found.push(path.relative(root, full).split(path.sep).join("/"));
      }
    }
  };
  walk(root);
  return found.sort();
}

function validateMirror() {
  const canonical = listFiles(CANONICAL_DIR);

  if (canonical.length === 0) {
    error(
      CANONICAL_DIR,
      "No skills found — expected the canonical skill tree.",
    );
    return;
  }

  const canonicalSet = new Set(canonical);

  for (const mirrorDir of MIRROR_DIRS) {
    const mirror = listFiles(mirrorDir);
    const mirrorSet = new Set(mirror);

    for (const file of canonical) {
      if (!mirrorSet.has(file)) {
        error(`${mirrorDir}/${file}`, "Missing from the mirror.");
        continue;
      }
      const a = fs.readFileSync(path.join(REPO_ROOT, CANONICAL_DIR, file));
      const b = fs.readFileSync(path.join(REPO_ROOT, mirrorDir, file));
      if (!a.equals(b)) {
        error(`${mirrorDir}/${file}`, "Differs from the canonical copy.");
      }
    }

    for (const file of mirror) {
      if (!canonicalSet.has(file)) {
        error(`${mirrorDir}/${file}`, "Not present in the canonical tree.");
      }
    }
  }

  info(
    `Compared ${canonical.length} files across ${MIRROR_DIRS.length + 1} skill trees.`,
  );
}

// Minimal frontmatter reader: the delimited block of `key: value` lines that
// both Claude Code and Bob parse at the top of a SKILL.md.
function readFrontmatter(content) {
  const lines = content.split("\n");
  if (lines[0].trim() !== "---") {
    return null;
  }
  const end = lines.indexOf("---", 1);
  if (end === -1) {
    return null;
  }

  const fields = {};
  for (const line of lines.slice(1, end)) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (match) {
      const raw = match[2].trim();
      // Must be a single quoted scalar end to end. Merely starting and ending
      // with a quote isn't enough — `"a" for "b: c"` looks quoted but is
      // invalid YAML, and treating it as quoted would skip the checks below.
      const quoted =
        /^"([^"\\]|\\.)*"$/.test(raw) || /^'([^']|'')*'$/.test(raw);
      fields[match[1]] = {
        value: quoted ? raw.slice(1, -1) : raw,
        quoted,
      };
    }
  }
  return fields;
}

function skillDirs() {
  const root = path.join(REPO_ROOT, CANONICAL_DIR);
  if (!fs.existsSync(root)) {
    return [];
  }
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function validateSkillShape(name) {
  const file = `${CANONICAL_DIR}/${name}/SKILL.md`;
  const fullPath = path.join(REPO_ROOT, file);

  if (!fs.existsSync(fullPath)) {
    error(file, "Skill directory has no SKILL.md.");
    return;
  }

  const frontmatter = readFrontmatter(fs.readFileSync(fullPath, "utf-8"));
  if (!frontmatter) {
    error(file, "Missing or unterminated `---` frontmatter block.");
    return;
  }

  const declaredName = frontmatter.name ? frontmatter.name.value : "";
  if (declaredName !== name) {
    error(
      file,
      `Frontmatter name "${declaredName}" must match the directory name "${name}".`,
    );
  }

  if (!frontmatter.description || !frontmatter.description.value) {
    error(
      file,
      "Frontmatter needs a non-empty `description` — it is what both harnesses match on, and a skill without one is ignored.",
    );
  }

  // In an unquoted YAML scalar these truncate or break the value, and the damage
  // is silent: the skill still loads, just with half a description to match on.
  // Quoting makes both legal, which is why the check only applies unquoted.
  for (const [key, field] of Object.entries(frontmatter)) {
    if (field.quoted) {
      continue;
    }
    if (/\s#/.test(field.value)) {
      error(
        file,
        `Frontmatter \`${key}\` contains " #", which YAML reads as a comment — everything after it is dropped. Rephrase, or quote the value.`,
      );
    }
    if (/:\s/.test(field.value)) {
      error(
        file,
        `Frontmatter \`${key}\` contains ": ", which YAML reads as a nested mapping. Rephrase, or quote the value.`,
      );
    }
  }
}

// Targets that are illustrative rather than real repo paths. Plan filenames earn
// their place here: caic-plan names them throughout, but the files themselves are
// git-ignored working drafts that only exist mid-effort.
function isPlaceholder(target) {
  return (
    target.includes("path/to/") ||
    target.includes("<") ||
    target.includes("*") ||
    target === "PLAN.md" ||
    /^PLAN-.*\.md$/.test(target)
  );
}

// GitHub's heading-anchor rules: lowercase, drop punctuation other than hyphen
// and underscore, then turn each remaining space into a hyphen. Spaces are not
// collapsed first — "Naming & prefix" anchors as "naming--prefix".
function slugify(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s/g, "-");
}

function headingSlugs(filePath) {
  const slugs = new Set();
  let inFence = false;
  for (const line of fs.readFileSync(filePath, "utf-8").split("\n")) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }
    const heading = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (heading) {
      slugs.add(slugify(heading[1]));
    }
  }
  return slugs;
}

// `file` is only where the finding gets reported; `baseDir` is what the target
// resolves against, which differs between markdown links (relative to their own
// file) and backtick paths (written from the repo root).
function checkTarget(file, baseDir, target, description) {
  if (
    /^(https?:)?\/\//.test(target) ||
    target.startsWith("#") ||
    target.startsWith("mailto:")
  ) {
    return;
  }

  const withoutAnchor = target.split("#")[0];
  if (!withoutAnchor || isPlaceholder(withoutAnchor)) {
    return;
  }

  const resolved = path.resolve(baseDir, withoutAnchor);
  if (!fs.existsSync(resolved)) {
    error(
      file,
      `${description} ${target} does not resolve relative to ${path.relative(REPO_ROOT, baseDir) || "."}.`,
    );
    return;
  }

  // A link into a heading that later gets renamed still resolves as a file, so
  // check the anchor too — otherwise cross-file section links rot in silence.
  const anchor = target.split("#")[1];
  if (anchor && resolved.endsWith(".md") && fs.statSync(resolved).isFile()) {
    if (!headingSlugs(resolved).has(anchor)) {
      error(
        file,
        `${description} ${target} resolves, but ${path.relative(REPO_ROOT, resolved)} has no heading anchored at #${anchor}.`,
      );
    }
  }
}

function validateSkillLinks(name) {
  const skillRoot = path.join(REPO_ROOT, CANONICAL_DIR, name);
  const markdown = listFiles(`${CANONICAL_DIR}/${name}`).filter((relative) =>
    relative.endsWith(".md"),
  );

  for (const relative of markdown) {
    const file = `${CANONICAL_DIR}/${name}/${relative}`;
    const content = fs.readFileSync(path.join(skillRoot, relative), "utf-8");

    const fileDir = path.dirname(path.join(skillRoot, relative));

    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      checkTarget(
        file,
        fileDir,
        match[2],
        `Broken link: [${match[1]}](${match[2]}) ->`,
      );
    }

    const fileRefRegex =
      /`([a-zA-Z0-9_\-./]+\.(ts|tsx|js|jsx|md|json|yml|yaml|scss|css))`/g;
    while ((match = fileRefRegex.exec(content)) !== null) {
      checkTarget(
        file,
        REPO_ROOT,
        match[1],
        `Outdated file reference \`${match[1]}\` ->`,
      );
    }
  }
}

// Markdown that sits at the root of the skills tree (the collection README)
// rather than inside a skill folder.
function validateCollectionDocs() {
  const root = path.join(REPO_ROOT, CANONICAL_DIR);
  if (!fs.existsSync(root)) {
    return;
  }
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      continue;
    }
    const file = `${CANONICAL_DIR}/${entry.name}`;
    const content = fs.readFileSync(path.join(root, entry.name), "utf-8");
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      checkTarget(
        file,
        root,
        match[2],
        `Broken link: [${match[1]}](${match[2]}) ->`,
      );
    }
  }
}

// Skills advertise themselves to assistants that support them, which is why
// AGENTS.md doesn't list them. Copilot has no such mechanism, so its
// instructions file carries the pointers — and has to keep carrying them.
function validateFallbackPointer(ownedSkills) {
  const fullPath = path.join(REPO_ROOT, FALLBACK_POINTER_FILE);
  if (!fs.existsSync(fullPath)) {
    error(FALLBACK_POINTER_FILE, "File not found.");
    return;
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  for (const name of ownedSkills) {
    // A real markdown link, not just the path in passing — a mention inside a
    // comment or a sentence gives a reader nothing to follow.
    if (!content.includes(`](../${CANONICAL_DIR}/${name}/SKILL.md)`)) {
      error(
        FALLBACK_POINTER_FILE,
        `Does not link ${CANONICAL_DIR}/${name}/SKILL.md — without it, an assistant that cannot load skills has no way to find that workflow.`,
      );
    }
  }
}

function syncMirror() {
  const from = path.join(REPO_ROOT, CANONICAL_DIR);

  // Never delete a mirror before confirming there is something to replace it
  // with — a tree without the canonical dir (wrong branch, mid-rebase) would
  // otherwise lose every mirrored skill and then crash on the copy.
  if (!fs.existsSync(from)) {
    console.error(
      `❌ ${CANONICAL_DIR} not found — nothing to sync from. No mirror was touched.`,
    );
    process.exit(1);
  }

  const canonical = new Set(listFiles(CANONICAL_DIR));
  for (const mirrorDir of MIRROR_DIRS) {
    // A mirror is regenerated wholesale, so anything only present there is
    // about to be destroyed. Name it rather than deleting silently.
    for (const file of listFiles(mirrorDir)) {
      if (!canonical.has(file)) {
        console.log(
          `   removing ${mirrorDir}/${file} (not in ${CANONICAL_DIR})`,
        );
      }
    }

    const to = path.join(REPO_ROOT, mirrorDir);
    fs.rmSync(to, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.cpSync(from, to, { recursive: true });
    console.log(`✨ Synced ${mirrorDir} from ${CANONICAL_DIR}.`);
  }
}

// --fix syncs and then validates rather than exiting. Syncing is the last step
// of the documented authoring loop, so if it reported success on its own, a
// broken link or a bad frontmatter name would wait for CI to surface.
if (fix) {
  syncMirror();
  console.log("");
}

console.log("🔍 Validating agent skills...\n");

const skills = skillDirs();
const ownedSkills = skills.filter((name) =>
  name.startsWith(OWNED_SKILL_PREFIX),
);
info(
  `Found ${skills.length} skills (${ownedSkills.length} owned by this repo).`,
);

const errorsBeforeMirror = errors;
validateMirror();
const mirrorDrifted = errors > errorsBeforeMirror;

for (const name of skills) {
  validateSkillShape(name);
}
for (const name of ownedSkills) {
  validateSkillLinks(name);
}
validateCollectionDocs();
validateFallbackPointer(ownedSkills);

console.log("\n" + "=".repeat(60));
console.log(`✅ Validation complete: ${errors} errors`);
console.log("=".repeat(60));

// Syncing only fixes drift. Offering it for a broken link or a bad name sends
// the reader to a command that copies the problem into the mirror and fails
// again identically.
if (errors > 0) {
  console.error(
    mirrorDrifted
      ? `\n❌ Validation failed. ${CANONICAL_DIR} is canonical — run \`npm run sync:skills\` to regenerate the mirrors.`
      : `\n❌ Validation failed. Fix the findings above in ${CANONICAL_DIR} (the canonical tree), then run \`npm run sync:skills\`.`,
  );
  process.exit(1);
}

console.log("\n✨ All checks passed!");
process.exit(0);
