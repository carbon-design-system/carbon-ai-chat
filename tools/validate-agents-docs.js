#!/usr/bin/env node

/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Validates AGENTS.md files for common issues:
 * - Broken internal links
 * - Outdated file references
 * - Missing required sections
 * - Inconsistent formatting
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..");
const ROOT_AGENTS_FILE = "AGENTS.md";

let errors = 0;
let warnings = 0;

function error(file, message) {
  console.error(`❌ ERROR in ${file}: ${message}`);
  errors++;
}

function warn(file, message) {
  console.warn(`  WARNING in ${file}: ${message}`);
  warnings++;
}

function info(message) {
  console.log(`ℹ️  ${message}`);
}

// Check if file exists
function validateFileExists(file) {
  const fullPath = path.join(REPO_ROOT, file);
  if (!fs.existsSync(fullPath)) {
    error("validation", `File not found: ${file}`);
    return false;
  }
  return true;
}

// Extract markdown links from content
function extractLinks(content) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links = [];
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    links.push({
      text: match[1],
      url: match[2],
      index: match.index,
    });
  }
  return links;
}

// Normalize markdown link targets by stripping anchors and :line suffixes.
function normalizeLinkTarget(url) {
  const withoutAnchor = url.split("#")[0];
  return withoutAnchor.replace(/:(\d+)(?=$)/, "");
}

// Resolve a documentation path reference either relative to the current file or repo root.
function resolveDocPath(file, referencePath) {
  const fileDir = path.dirname(path.join(REPO_ROOT, file));
  const relativeTargetPath = path.resolve(fileDir, referencePath);

  if (fs.existsSync(relativeTargetPath)) {
    return relativeTargetPath;
  }

  const rootTargetPath = path.join(REPO_ROOT, referencePath);
  if (fs.existsSync(rootTargetPath)) {
    return rootTargetPath;
  }

  return null;
}

// Skip links that are examples/placeholders rather than real repo references.
function shouldSkipDocReference(referencePath) {
  return (
    referencePath.includes("path/to/") ||
    referencePath.includes("issue #") ||
    referencePath === "PR.md" ||
    referencePath === "src/foo/Bar.ts" ||
    referencePath === "../AGENTS.md" ||
    referencePath === "../docs/AGENTS.md" ||
    referencePath === "./ChatContainer.md" ||
    referencePath === "docs/release-notes.md" ||
    referencePath === "../../tests/store/spec/reactReduxShim_spec.tsx" ||
    referencePath.startsWith("<") ||
    referencePath.includes("<file>") ||
    referencePath.includes("<slug>") ||
    referencePath.includes("<component>")
  );
}

// Validate internal links
function validateInternalLinks(file, content) {
  const links = extractLinks(content);

  for (const link of links) {
    // Skip external links
    if (link.url.startsWith("http://") || link.url.startsWith("https://")) {
      continue;
    }

    // Skip anchor-only links
    if (link.url.startsWith("#")) {
      continue;
    }

    const normalizedTarget = normalizeLinkTarget(link.url);
    if (!normalizedTarget || shouldSkipDocReference(normalizedTarget)) {
      continue;
    }

    const targetPath = resolveDocPath(file, normalizedTarget);
    if (!targetPath) {
      error(
        file,
        `Broken link: [${link.text}](${link.url}) -> ${normalizedTarget} not found`,
      );
    }
  }
}

// Extract file references from content (e.g., `path/to/file.ts`)
function extractFileReferences(content) {
  // Match code-formatted paths that look like file paths
  const fileRefRegex =
    /`([a-zA-Z0-9_\-./]+\.(ts|tsx|js|jsx|md|json|yml|yaml|scss|css))`/g;
  const refs = [];
  let match;
  while ((match = fileRefRegex.exec(content)) !== null) {
    refs.push({
      path: match[1],
      index: match.index,
    });
  }
  return refs;
}

// Validate file references
function validateFileReferences(file, content) {
  const refs = extractFileReferences(content);

  for (const ref of refs) {
    if (shouldSkipDocReference(ref.path) || ref.path.includes("example")) {
      continue;
    }

    if (resolveDocPath(file, ref.path)) {
      continue;
    }

    warn(file, `File reference may be outdated: \`${ref.path}\``);
  }
}

// Check for required sections in main AGENTS.md files
function validateRequiredSections(file, content) {
  // Only check main package AGENTS.md files
  if (!file.endsWith("AGENTS.md") || file.includes("src/")) {
    return;
  }

  const requiredSections = ["Related Guidance", "Definition of done"];

  for (const section of requiredSections) {
    const regex = new RegExp(`^##+ ${section}`, "m");
    if (!regex.test(content)) {
      warn(file, `Missing recommended section: "${section}"`);
    }
  }
}

// Check for emoji in mode names (should be removed per PLAN-01)
function validateNoEmojiInModes(file, content) {
  if (file !== "AGENTS.md") {
    return;
  }

  const emojiRegex = /["'][\p{Emoji}]/u;
  if (emojiRegex.test(content)) {
    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      if (line.includes("mode") && emojiRegex.test(line)) {
        warn(
          file,
          `Line ${idx + 1}: Mode name contains emoji (should be removed per PLAN-01)`,
        );
      }
    });
  }
}

// Check for consistent path notation
function validatePathNotation(file, content) {
  const links = extractLinks(content);

  for (const link of links) {
    // Skip external links
    if (link.url.startsWith("http://") || link.url.startsWith("https://")) {
      continue;
    }

    // Check for inconsistent path notation
    if (link.url.startsWith("/") && !link.url.startsWith("http")) {
      warn(
        file,
        `Absolute path in link: [${link.text}](${link.url}) - prefer relative paths`,
      );
    }
  }
}

// Discover AGENTS-related docs by crawling markdown links from the root AGENTS.md
function discoverAgentsFiles() {
  const discovered = new Set();
  const queue = [ROOT_AGENTS_FILE];

  while (queue.length > 0) {
    const file = queue.shift();
    if (!file || discovered.has(file)) {
      continue;
    }

    if (!validateFileExists(file)) {
      continue;
    }

    const fullPath = path.join(REPO_ROOT, file);
    const content = fs.readFileSync(fullPath, "utf-8");
    discovered.add(file);

    const links = extractLinks(content);
    const fileDir = path.dirname(fullPath);

    for (const link of links) {
      if (
        link.url.startsWith("http://") ||
        link.url.startsWith("https://") ||
        link.url.startsWith("#")
      ) {
        continue;
      }

      const urlWithoutAnchor = link.url.split("#")[0];
      if (!urlWithoutAnchor) {
        continue;
      }

      const targetPath = path.resolve(fileDir, urlWithoutAnchor);
      const relativePath = path.relative(REPO_ROOT, targetPath);

      if (
        fs.existsSync(targetPath) &&
        (relativePath === "AGENTS.md" ||
          relativePath.startsWith("AGENTS_") ||
          relativePath.endsWith("/AGENTS.md"))
      ) {
        queue.push(relativePath);
      }
    }
  }

  return Array.from(discovered).sort();
}

// Main validation
function validateFile(file) {
  info(`Validating ${file}...`);

  if (!validateFileExists(file)) {
    return;
  }

  const fullPath = path.join(REPO_ROOT, file);
  const content = fs.readFileSync(fullPath, "utf-8");

  validateInternalLinks(file, content);
  validateFileReferences(file, content);
  validateRequiredSections(file, content);
  validateNoEmojiInModes(file, content);
  validatePathNotation(file, content);
}

// Run validation
console.log("🔍 Validating AGENTS.md files...\n");

const agentsFiles = discoverAgentsFiles();
info(
  `Discovered ${agentsFiles.length} AGENTS documentation files from ${ROOT_AGENTS_FILE}.`,
);

for (const file of agentsFiles) {
  validateFile(file);
}

console.log("\n" + "=".repeat(60));
console.log(`✅ Validation complete: ${errors} errors, ${warnings} warnings`);
console.log("=".repeat(60));

if (errors > 0) {
  console.error("\n❌ Validation failed. Please fix errors above.");
  process.exit(1);
}

if (warnings > 0) {
  console.warn(
    "\n  Validation passed with warnings. Consider addressing them.",
  );
  process.exit(0);
}

console.log("\n✨ All checks passed!");
process.exit(0);
