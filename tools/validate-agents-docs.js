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
 * - Size budgets, per file and per chain (see MAX_FILE_BYTES below)
 *
 * Discovery starts at every AGENTS.md on disk and follows linked topic docs
 * under references/. Generated output, skill mirrors, and drafts are excluded.
 */

const fs = require('fs');
const path = require('path');
const {
  checkLocalLink,
  extractLinks,
  withoutFencedCode,
} = require('./guidance-links-lib');

const REPO_ROOT = path.join(__dirname, '..');
const ROOT_AGENTS_FILE = 'AGENTS.md';

// Soft wrapping makes line counts misleading; bytes are a stable size proxy.
// The chain budget catches ancestor costs that per-file limits miss. These
// repo limits exclude personal instructions and references loaded on demand;
// they do not measure tokens or the active harness's total context allowance.
const MAX_FILE_BYTES = 12 * 1024;
const MAX_CHAIN_BYTES = 28 * 1024;

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
    error('validation', `File not found: ${file}`);
    return false;
  }
  return true;
}

// Extract package root from AGENTS.md file path for context-aware resolution
function getPackageRoot(agentsFile) {
  if (agentsFile.startsWith('packages/ai-chat-components/')) {
    return 'packages/ai-chat-components';
  }
  if (agentsFile.startsWith('packages/ai-chat/')) {
    return 'packages/ai-chat';
  }
  if (agentsFile.startsWith('packages/typedoc-theme/')) {
    return 'packages/typedoc-theme';
  }
  if (agentsFile.startsWith('demo/')) {
    return 'demo';
  }
  if (agentsFile.startsWith('examples/')) {
    // Return the specific example directory (e.g., examples/react/basic-float).
    // The trailing slash matters: without it a framework-level doc such as
    // `examples/react/AGENTS.md` captures its own filename as the "root", and
    // every path resolution below then joins onto a file instead of a folder.
    const match = agentsFile.match(/^(examples\/[^/]+\/[^/]+)\//);
    return match ? match[1] : path.dirname(agentsFile);
  }
  return null;
}

// Recursively search for a file by name within a directory
function findFileRecursive(dir, filename) {
  if (!fs.existsSync(dir)) {
    return null;
  }

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (
        isExcluded(path.relative(REPO_ROOT, fullPath).split(path.sep).join('/'))
      ) {
        continue;
      }

      if (entry.isFile() && entry.name === filename) {
        return fullPath;
      }

      if (entry.isDirectory()) {
        const found = findFileRecursive(fullPath, filename);
        if (found) {
          return found;
        }
      }
    }
  } catch (_err) {
    // Ignore permission errors, etc.
    return null;
  }

  return null;
}

// Resolve a documentation path reference with context-aware search.
// Tries multiple strategies:
// 1. Relative to the AGENTS.md file
// 2. From repo root
// 3. Within the same package/directory tree
// 4. Recursive search for simple filenames
function resolveDocPath(file, referencePath) {
  const fileDir = path.dirname(path.join(REPO_ROOT, file));

  // 1. Try relative to current AGENTS.md
  const relativeTargetPath = path.resolve(fileDir, referencePath);
  if (fs.existsSync(relativeTargetPath)) {
    return relativeTargetPath;
  }

  // 2. Try from repo root
  const rootTargetPath = path.join(REPO_ROOT, referencePath);
  if (fs.existsSync(rootTargetPath)) {
    return rootTargetPath;
  }

  // 3. Try within the same package/directory tree
  const packageRoot = getPackageRoot(file);
  if (packageRoot) {
    // Try direct path within package
    const packagePath = path.join(REPO_ROOT, packageRoot, referencePath);
    if (fs.existsSync(packagePath)) {
      return packagePath;
    }

    // Try common subdirectories within package
    const commonDirs = ['src', 'tests', 'docs', 'tasks', 'theme'];
    for (const dir of commonDirs) {
      const subPath = path.join(REPO_ROOT, packageRoot, dir, referencePath);
      if (fs.existsSync(subPath)) {
        return subPath;
      }
    }

    // For references with subdirectories (e.g., "store/actions.ts", "layouts/default.js"),
    // search recursively within the package
    if (referencePath.includes('/') || referencePath.includes('\\')) {
      const found = findFileRecursive(
        path.join(REPO_ROOT, packageRoot),
        path.basename(referencePath)
      );
      // Verify the found file matches the full relative path
      if (found && found.endsWith(referencePath.replace(/\\/g, '/'))) {
        return found;
      }
    }
  }

  // 4. For simple filenames (no path separators), search recursively
  // but only in relevant directories to avoid false matches
  if (!referencePath.includes('/') && !referencePath.includes('\\')) {
    const searchRoots = packageRoot
      ? [packageRoot]
      : ['packages', 'demo', 'examples'];

    for (const root of searchRoots) {
      const searchPath = path.join(REPO_ROOT, root);
      const found = findFileRecursive(searchPath, referencePath);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

// Skip links that are examples/placeholders rather than real repo references.
function shouldSkipDocReference(referencePath) {
  return (
    referencePath.includes('path/to/') ||
    referencePath.includes('issue #') ||
    referencePath === 'PR.md' ||
    referencePath === 'PLAN.md' ||
    /^PLAN-\d+.*\.md$/.test(referencePath) || // PLAN-1-title.md, PLAN-1.md, etc.
    referencePath === 'src/foo/Bar.ts' ||
    referencePath === '../AGENTS.md' ||
    referencePath === '../docs/AGENTS.md' ||
    referencePath === './ChatContainer.md' ||
    referencePath === 'docs/release-notes.md' ||
    referencePath === '../../tests/store/spec/reactReduxShim_spec.tsx' ||
    referencePath.startsWith('<') ||
    referencePath.includes('<file>') ||
    referencePath.includes('<slug>') ||
    referencePath.includes('<component>') ||
    referencePath.includes('<thing>') ||
    referencePath.includes('<name>') ||
    // Skip file naming patterns (not actual files)
    referencePath.startsWith('.') || // .stories.js, .test.ts, etc.
    referencePath.startsWith('-') || // -react.stories.jsx, etc.
    referencePath.includes('*') // wildcards
  );
}

// A link target is an "agents doc" if it points at an AGENTS.md entry point, a
// legacy AGENTS_* sibling, or a topic doc under a references/ folder.
function isAgentsDocTarget(target) {
  const base = path.basename(target);
  const parent = path.basename(path.dirname(target));
  return (
    base === 'AGENTS.md' ||
    (base.startsWith('AGENTS_') && base.endsWith('.md')) ||
    (parent === 'references' && base.endsWith('.md'))
  );
}

// Validate internal links
function validateInternalLinks(file, content) {
  for (const link of extractLinks(content)) {
    const { problem } = checkLocalLink(REPO_ROOT, file, link.url);
    if (problem) {
      error(file, `Broken link: [${link.text}](${link.url}) -> ${problem}`);
    }
  }
}

// Extract file references from content (e.g., `path/to/file.ts`)
function extractFileReferences(content) {
  // Match code-formatted paths that look like file paths
  const fileRefRegex =
    /`([a-zA-Z0-9_\-./]+\.(ts|tsx|js|jsx|cjs|mjs|md|json|yml|yaml|scss|css))`/g;
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
  const refs = extractFileReferences(withoutFencedCode(content));

  for (const ref of refs) {
    if (shouldSkipDocReference(ref.path) || ref.path.includes('example')) {
      continue;
    }

    if (resolveDocPath(file, ref.path)) {
      continue;
    }

    warn(file, `File reference may be outdated: \`${ref.path}\``);
  }
}

// Check for consistent path notation
function validatePathNotation(file, content) {
  const links = extractLinks(content);

  for (const link of links) {
    // Skip external links
    if (link.url.startsWith('http://') || link.url.startsWith('https://')) {
      continue;
    }

    // Check for inconsistent path notation
    if (link.url.startsWith('/') && !link.url.startsWith('http')) {
      warn(
        file,
        `Absolute path in link: [${link.text}](${link.url}) - prefer relative paths`
      );
    }
  }
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

const EXCLUDED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'dist',
  'es',
  'es-custom',
  'lib',
  'umd',
  'build',
  'coverage',
  '.nyc_output',
  '.parcel-cache',
  '.next',
  'generated_docs',
  'storybook-static',
  'storybook-react-static',
]);
const EXCLUDED_PATHS = [
  '.agents/skills',
  '.claude/skills',
  '.bob/skills/carbon-builder',
  '.github/plan-drafts',
  '.github/pr-drafts',
  '.github/issue-drafts',
  '.github/adr-drafts',
  'packages/ai-chat/docs/api/markdown',
];

function isExcluded(file) {
  return (
    file.split('/').some((part) => EXCLUDED_DIRECTORIES.has(part)) ||
    EXCLUDED_PATHS.some(
      (prefix) => file === prefix || file.startsWith(`${prefix}/`)
    )
  );
}

// Directory-based inventory matches how a harness assembles an AGENTS chain.
function agentsFilesOnDisk() {
  const found = [];

  const walk = (dir) => {
    const entries = fs.readdirSync(path.join(REPO_ROOT, dir || '.'), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      const relative = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!isExcluded(relative)) {
          walk(relative);
        }
      } else if (entry.isFile() && entry.name === 'AGENTS.md') {
        found.push(relative);
      }
    }
  };

  walk('');
  return found.sort();
}

// Two budgets: one file, and the chain a harness loads when work happens in
// that file's directory (the root file plus every AGENTS.md on the path down).
function validateBudgets(files) {
  const sizes = new Map(
    files.map((file) => [file, fs.statSync(path.join(REPO_ROOT, file)).size])
  );

  for (const [file, size] of sizes) {
    if (size > MAX_FILE_BYTES) {
      error(
        file,
        `${formatBytes(size)} exceeds the ${formatBytes(
          MAX_FILE_BYTES
        )} per-file budget by ${formatBytes(
          size - MAX_FILE_BYTES
        )}. Move topic detail into a references/ file and link to it with a "read when…" hint.`
      );
    }
  }

  for (const leaf of files) {
    const leafDir = path.dirname(leaf);
    const chain = files.filter((file) => {
      const dir = path.dirname(file);
      return dir === '.' || dir === leafDir || leafDir.startsWith(`${dir}/`);
    });
    const total = chain.reduce((sum, file) => sum + sizes.get(file), 0);

    if (total > MAX_CHAIN_BYTES) {
      const breakdown = chain
        .map((file) => `${file} (${formatBytes(sizes.get(file))})`)
        .join(' + ');
      error(
        leaf,
        `Working in ${leafDir} loads ${formatBytes(
          total
        )}, over the ${formatBytes(
          MAX_CHAIN_BYTES
        )} chain budget: ${breakdown}. Trim the heaviest file in the chain — an ancestor pays into every chain below it.`
      );
    }
  }

  info(
    `Checked ${files.length} AGENTS.md files against the ${formatBytes(
      MAX_FILE_BYTES
    )} file and ${formatBytes(MAX_CHAIN_BYTES)} chain budgets.`
  );
}

// Topic links add conditional guidance to the directory-based AGENTS inventory.
function discoverAgentsFiles(files) {
  const discovered = new Set();
  const queue = Array.from(new Set([ROOT_AGENTS_FILE, ...files]));

  while (queue.length > 0) {
    const file = queue.shift();
    if (!file || discovered.has(file)) {
      continue;
    }

    if (!validateFileExists(file)) {
      continue;
    }

    const fullPath = path.join(REPO_ROOT, file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    discovered.add(file);

    for (const link of extractLinks(content)) {
      const { target } = checkLocalLink(REPO_ROOT, file, link.url);
      if (!target) {
        continue;
      }
      const relativePath = path
        .relative(REPO_ROOT, target)
        .split(path.sep)
        .join('/');
      if (
        !isExcluded(relativePath) &&
        isAgentsDocTarget(relativePath) &&
        fs.lstatSync(target).isFile()
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
  const content = fs.readFileSync(fullPath, 'utf-8');

  validateInternalLinks(file, content);
  validateFileReferences(file, content);
  validatePathNotation(file, content);
}

// Run validation
console.log('🔍 Validating AGENTS.md files...\n');

const filesOnDisk = agentsFilesOnDisk();
const agentsFiles = discoverAgentsFiles(filesOnDisk);
info(
  `Discovered ${agentsFiles.length} AGENTS documentation files from ${filesOnDisk.length} AGENTS.md entry points.`
);

for (const file of agentsFiles) {
  validateFile(file);
}

validateBudgets(filesOnDisk);

console.log('\n' + '='.repeat(60));
console.log(`✅ Validation complete: ${errors} errors, ${warnings} warnings`);
console.log('='.repeat(60));

if (errors > 0) {
  console.error('\n❌ Validation failed. Please fix errors above.');
  process.exit(1);
}

if (warnings > 0) {
  console.warn(
    '\n  Validation passed with warnings. Consider addressing them.'
  );
  process.exit(0);
}

console.log('\n✨ All checks passed!');
process.exit(0);
