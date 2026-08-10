#!/usr/bin/env node

/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Validates the architecture decision records in docs/adr/.
 *
 * ADRs sit outside every other doc check in this repo. Prettier formats them;
 * tools/validate-agents-docs.js does not crawl them, because its discovery
 * only follows links to AGENTS.md entry points and topic docs under a
 * references/ folder. Without this script, a broken link or a stale index row
 * reaches main unnoticed. This checks:
 *
 * 1. Record shape — frontmatter parses, required keys are present, `status` is
 *    one of the four known values, and the filename number matches the heading.
 * 2. Lifecycle coherence — a `proposed` record names its comment window and
 *    tracking issue; a `superseded` one names its replacement. Status is not
 *    self-executing here (see ADR-0001), so a record that claims a state has to
 *    carry the fields that state implies.
 * 3. Supersede pairs — `supersedes` and `superseded-by` point at real records
 *    and agree with each other. A one-sided link is invisible from the side
 *    readers arrive on.
 * 4. Links — every relative markdown link resolves, strictly relative to the
 *    file, with its anchor present in the target when one is given.
 * 5. The index — the table between the adr-index markers in README.md is
 *    generated from the records, so it cannot drift. Status appears there and
 *    in frontmatter, but only one of the two is ever written by hand.
 *
 * Run with --fix to regenerate the index.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const ADR_DIR = 'docs/adr';
const INDEX_FILE = `${ADR_DIR}/README.md`;
const TEMPLATE_FILE = `${ADR_DIR}/template.md`;
const RECORD_PATTERN = /^(\d{4})-[a-z0-9]+(-[a-z0-9]+)*\.md$/;
const STATUSES = ['proposed', 'accepted', 'rejected', 'superseded'];

const fix = process.argv.includes('--fix');

let errors = 0;

function error(file, message) {
  console.error(`❌ ERROR in ${file}: ${message}`);
  errors++;
}

function info(message) {
  console.log(`ℹ️  ${message}`);
}

// The delimited `key: value` block at the top of a record. Values are plain
// scalars here — no nesting, no lists — so a line reader is enough and avoids
// pulling a YAML parser into a tooling script that has no other need for one.
function readFrontmatter(content) {
  const lines = content.split('\n');
  if (lines[0].trim() !== '---') {
    return null;
  }
  const end = lines.indexOf('---', 1);
  if (end === -1) {
    return null;
  }

  const fields = {};
  for (const line of lines.slice(1, end)) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (match) {
      fields[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return fields;
}

function recordFiles() {
  const dir = path.join(REPO_ROOT, ADR_DIR);
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .filter((name) => name !== 'README.md' && name !== 'template.md')
    .sort();
}

// GitHub's slug: lowercase, drop anything that is not a word character, space,
// or hyphen, then spaces to hyphens.
function slugify(heading) {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function headingSlugs(content) {
  return new Set(
    content
      .split('\n')
      .filter((line) => /^#{1,6}\s/.test(line))
      .map((line) => slugify(line.replace(/^#{1,6}\s+/, '').trim()))
  );
}

function validateShape(name) {
  const file = `${ADR_DIR}/${name}`;
  const content = fs.readFileSync(path.join(REPO_ROOT, file), 'utf-8');

  if (!RECORD_PATTERN.test(name)) {
    error(
      file,
      'Filename must be NNNN-kebab-case-title.md — four digits, then a lowercase slug.'
    );
    return null;
  }

  const frontmatter = readFrontmatter(content);
  if (!frontmatter) {
    error(file, 'No frontmatter block. Copy docs/adr/template.md to start.');
    return null;
  }

  for (const key of ['status', 'date']) {
    if (!frontmatter[key]) {
      error(file, `Frontmatter is missing a non-empty \`${key}\`.`);
    }
  }

  const status = frontmatter.status;
  if (status && !STATUSES.includes(status)) {
    error(
      file,
      `Unknown status "${status}". Use one of: ${STATUSES.join(', ')}.`
    );
  }

  const number = name.slice(0, 4);
  const heading = content.match(/^#\s+ADR-(\d{4}):\s*(.+)$/m);
  if (!heading) {
    error(file, 'No `# ADR-NNNN: <title>` heading.');
  } else if (heading[1] !== number) {
    error(
      file,
      `Heading says ADR-${heading[1]} but the filename says ${number}.`
    );
  }

  // A record only claims a state it can back up. `proposed` without a window or
  // a discussion venue is a decision nobody can weigh in on, which defeats the
  // point of merging it early.
  if (status === 'proposed') {
    for (const key of ['comments-by', 'discussion']) {
      if (!frontmatter[key]) {
        error(
          file,
          `A \`proposed\` record needs \`${key}\` — see docs/adr/README.md.`
        );
      }
    }
  }
  if (status === 'superseded' && !frontmatter['superseded-by']) {
    error(file, 'A `superseded` record must name its replacement.');
  }

  return {
    file,
    name,
    number,
    title: heading ? heading[2].trim() : null,
    frontmatter,
    content,
  };
}

function validateSupersedes(records) {
  const byNumber = new Map(records.map((r) => [r.number, r]));

  // Accepts "0002" or "ADR-0002"; anything else is a typo worth surfacing.
  const asNumber = (raw) => {
    const match = String(raw).match(/(\d{4})/);
    return match ? match[1] : null;
  };

  for (const record of records) {
    for (const [key, inverse] of [
      ['supersedes', 'superseded-by'],
      ['superseded-by', 'supersedes'],
    ]) {
      const raw = record.frontmatter[key];
      if (!raw) {
        continue;
      }
      const target = asNumber(raw);
      if (!target) {
        error(record.file, `\`${key}: ${raw}\` does not name an ADR number.`);
        continue;
      }
      const other = byNumber.get(target);
      if (!other) {
        error(
          record.file,
          `\`${key}\` points at ADR-${target}, which does not exist.`
        );
        continue;
      }
      if (asNumber(other.frontmatter[inverse] || '') !== record.number) {
        error(
          other.file,
          `Missing \`${inverse}: ${record.number}\` — ADR-${record.number} claims the other half of this pair, and a one-sided link is invisible from this side.`
        );
      }
    }
  }
}

function validateLinks(file, content) {
  const dir = path.dirname(path.join(REPO_ROOT, file));

  for (const match of content.matchAll(/\[([^\]]*)\]\(([^)]+)\)/g)) {
    const [, text, url] = match;
    if (/^(https?:|mailto:|#)/.test(url)) {
      continue;
    }

    const [target, anchor] = url.split('#');
    if (!target) {
      continue;
    }

    const resolved = path.resolve(dir, target);
    if (!fs.existsSync(resolved)) {
      error(
        file,
        `Broken link: [${text}](${url}) does not resolve relative to ${path.dirname(file)}.`
      );
      continue;
    }

    if (anchor && resolved.endsWith('.md')) {
      const slugs = headingSlugs(fs.readFileSync(resolved, 'utf-8'));
      if (!slugs.has(anchor)) {
        error(
          file,
          `[${text}](${url}) resolves, but ${path.relative(REPO_ROOT, resolved)} has no heading anchored at #${anchor}.`
        );
      }
    }
  }
}

// The index is generated, not written. Status lives in frontmatter, and a
// hand-copied second home for it drifts the first time someone flips one
// without touching the table.
function renderIndex(records) {
  const cell = (record) => {
    const status = record.frontmatter.status || '';
    const label = status ? status[0].toUpperCase() + status.slice(1) : '—';
    const replacement = record.frontmatter['superseded-by'];
    if (status !== 'superseded' || !replacement) {
      return label;
    }
    const target = records.find(
      (r) => r.number === String(replacement).match(/(\d{4})/)?.[1]
    );
    return target ? `Superseded by [${target.number}](${target.name})` : label;
  };

  // Blank lines around the table are what prettier produces for a fenced-off
  // region. Emitting them here keeps `sync:adrs` output already-formatted, so
  // regenerating the index never leaves `npm run format` failing.
  return [
    '',
    '| ADR | Title | Status |',
    '| --- | --- | --- |',
    ...records.map(
      (record) =>
        `| [${record.number}](${record.name}) | ${record.title || '—'} | ${cell(record)} |`
    ),
    '',
  ].join('\n');
}

function validateIndex(records) {
  const file = path.join(REPO_ROOT, INDEX_FILE);
  const content = fs.readFileSync(file, 'utf-8');

  const region = content.match(
    /(<!-- adr-index:start -->\n)([\s\S]*?)(\n<!-- adr-index:end -->)/
  );
  if (!region) {
    error(
      INDEX_FILE,
      'No `<!-- adr-index:start -->` / `<!-- adr-index:end -->` markers. The index is generated between them.'
    );
    return;
  }

  const expected = renderIndex(records);
  if (region[2].trim() === expected.trim()) {
    return;
  }

  if (fix) {
    fs.writeFileSync(
      file,
      content.replace(region[0], `${region[1]}${expected}${region[3]}`)
    );
    info(`Regenerated the index in ${INDEX_FILE}.`);
    return;
  }

  error(
    INDEX_FILE,
    'The index is out of date. Run `npm run sync:adrs` to regenerate it.'
  );
}

function main() {
  console.log('\n🔍 Validating architecture decision records...\n');

  if (!fs.existsSync(path.join(REPO_ROOT, ADR_DIR))) {
    console.log(`No ${ADR_DIR} directory — nothing to validate.\n`);
    return;
  }

  const records = recordFiles().map(validateShape).filter(Boolean);

  validateSupersedes(records);
  validateIndex(records);

  // The template and the index are linked like any other page, and a broken
  // pointer in either is the one most readers hit first.
  for (const file of [INDEX_FILE, TEMPLATE_FILE]) {
    if (fs.existsSync(path.join(REPO_ROOT, file))) {
      validateLinks(file, fs.readFileSync(path.join(REPO_ROOT, file), 'utf-8'));
    }
  }
  for (const record of records) {
    validateLinks(record.file, record.content);
  }

  info(`Checked ${records.length} record(s) in ${ADR_DIR}.`);

  console.log(`\n${'='.repeat(60)}`);
  if (errors > 0) {
    console.error(`❌ Validation failed: ${errors} error(s)`);
    console.log(`${'='.repeat(60)}\n`);
    process.exit(1);
  }
  console.log('✅ Validation complete: 0 errors');
  console.log(`${'='.repeat(60)}\n`);
}

main();
