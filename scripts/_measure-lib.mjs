/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { ESLint } from 'eslint';
import sonarjs from 'eslint-plugin-sonarjs';

const PRIMARY_AREAS = [
  'packages/ai-chat/',
  'packages/ai-chat-components/',
  'packages/typedoc-theme/',
  'examples/',
];

const SOURCE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

const parser = createRequire(import.meta.url).resolve('@typescript-eslint/parser');

export function labelsFor(rel) {
  const r = rel.replaceAll('\\', '/');
  if (PRIMARY_AREAS.some((p) => r.startsWith(p))) {
    return { important: 'Important', blocker: 'Blocker' };
  }
  if (r.startsWith('demo/')) {
    return { important: 'Nit', blocker: 'Important' };
  }
  return null;
}

export function toRepoRelative(f) {
  return relative(process.cwd(), resolve(f)).replaceAll('\\', '/');
}

export function changedFiles(base) {
  const args = ['diff', '--name-only', '--diff-filter=d', `${base}...HEAD`];
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(result.stderr.trim());
    process.exit(1);
  }
  return result.stdout.split('\n').filter((f) => SOURCE_FILE.test(f));
}

export function contentAt(base, file) {
  const result = spawnSync('git', ['show', `${base}:${file}`], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout : null;
}

function firstFatal(messages) {
  return messages.find((m) => m.fatal || (m.ruleId == null && m.severity === 2));
}

export function makeLinter(rules) {
  const eslint = new ESLint({
    useEslintrc: false,
    allowInlineConfig: false,
    plugins: { sonarjs },
    baseConfig: {
      plugins: ['sonarjs'],
      parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
      rules,
    },
  });
  return async (content, filePath) => {
    const [result] = await eslint.lintText(content, { filePath });
    const messages = result?.messages ?? [];
    const fatal = firstFatal(messages);
    if (fatal) throw new Error(fatal.message);
    return messages;
  };
}

function fail(message, usage) {
  console.error(`error: ${message}`);
  console.error(usage);
  process.exit(2);
}

function parseInts(values, ints, defaults, usage) {
  const out = {};
  for (const name of ints) {
    const raw = values[name];
    if (raw !== undefined && !/^\d+$/.test(raw)) {
      fail(`--${name} requires a non-negative integer`, usage);
    }
    out[name] = raw === undefined ? (defaults[name] ?? null) : Number(raw);
  }
  return out;
}

export function parseCli({ ints, defaults = {}, usage }) {
  const options = { changed: { type: 'string' } };
  for (const name of ints) options[name] = { type: 'string' };
  let parsed;
  try {
    parsed = parseArgs({ options, allowPositionals: true });
  } catch (e) {
    fail(e.message, usage);
  }
  const { values, positionals } = parsed;
  const files = positionals.map(toRepoRelative);
  const changed = values.changed ?? null;
  if (files.length > 0 && changed !== null) {
    fail('positional files and --changed are mutually exclusive', usage);
  }
  if (files.length === 0 && changed === null) {
    console.error(usage);
    process.exit(2);
  }
  return { files, changed, ...parseInts(values, ints, defaults, usage) };
}
