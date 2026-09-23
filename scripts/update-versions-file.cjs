/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const stableVersion = /^v\d+\.\d+\.\d+$/;
const componentsFloor = 'v1.11.0';
const file = 'versions.js';

function validVersion(version) {
  return (
    stableVersion.test(version) &&
    version
      .slice(1)
      .split('.')
      .every((part) => Number.isSafeInteger(Number(part)))
  );
}

function readVersions(content, name, optional = false) {
  const expression = new RegExp(
    `export const ${name}\\s*=\\s*(\\[[\\s\\S]*?\\]);`,
    'g'
  );
  const matches = [...content.matchAll(expression)];
  const declarations = [
    ...content.matchAll(new RegExp(`export const ${name}\\b`, 'g')),
  ];
  if (optional && declarations.length === 0) {
    return null;
  }
  if (declarations.length !== 1 || matches.length !== 1) {
    throw new Error(`Expected one ${name} array`);
  }

  const literal = matches[0][1];
  if (!/^\[\s*(?:'v\d+\.\d+\.\d+'\s*,?\s*)*\]$/.test(literal)) {
    throw new Error(`Invalid ${name} array`);
  }
  const versions = JSON.parse(
    literal.replaceAll("'", '"').replace(/,\s*\]$/, ']')
  );
  if (
    !Array.isArray(versions) ||
    versions.length === 0 ||
    !versions.every(validVersion)
  ) {
    throw new Error(`Invalid ${name} array`);
  }
  return versions;
}

function orderVersions(versions) {
  return [...new Set(versions)].sort((left, right) => {
    const leftParts = left.slice(1).split('.').map(Number);
    const rightParts = right.slice(1).split('.').map(Number);
    for (let index = 0; index < 3; index += 1) {
      if (leftParts[index] !== rightParts[index]) {
        return leftParts[index] > rightParts[index] ? -1 : 1;
      }
    }
    return 0;
  });
}

function atOrAfterComponentsFloor(version) {
  const parts = version.slice(1).split('.').map(Number);
  const floor = componentsFloor.slice(1).split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (parts[index] !== floor[index]) {
      return parts[index] > floor[index];
    }
  }
  return true;
}

function writeVersions(content, name, versions) {
  const replacement = `export const ${name} = [\n${versions.map((version) => `  '${version}',`).join('\n')}\n];`;
  const expression = new RegExp(
    `export const ${name}\\s*=\\s*\\[[\\s\\S]*?\\];`
  );
  return expression.test(content)
    ? content.replace(expression, replacement)
    : `${content.trimEnd()}\n\n${replacement}\n`;
}

const { BUILD_SHA, CHAT_VERSION, COMPONENTS_VERSION, SEED_VERIFIED } =
  process.env;
if (!/^[0-9a-f]{40}$/.test(BUILD_SHA || '')) {
  throw new Error('Invalid build SHA');
}
for (const version of [CHAT_VERSION, COMPONENTS_VERSION]) {
  if (!validVersion(`v${version}`)) {
    throw new Error('Expected stable package versions');
  }
}

for (const [path, version] of [
  ['packages/ai-chat/package.json', CHAT_VERSION],
  ['packages/ai-chat-components/package.json', COMPONENTS_VERSION],
]) {
  const built = JSON.parse(
    execFileSync('git', ['show', `${BUILD_SHA}:${path}`], { encoding: 'utf8' })
  );
  if (built.version !== version) {
    throw new Error(`Build SHA does not contain ${path} version ${version}`);
  }
}

const published = fs.readFileSync('published-versions.js', 'utf8');
const publishedChat = readVersions(published, 'AI_CHAT_VERSIONS');
const publishedComponents = readVersions(
  published,
  'AI_CHAT_COMPONENTS_VERSIONS',
  true
);
if (!publishedComponents && SEED_VERIFIED !== 'true') {
  throw new Error(
    'Components seed URLs must be verified before upgrading the catalog'
  );
}

let content = fs.readFileSync(file, 'utf8');
readVersions(content, 'AI_CHAT_VERSIONS');
readVersions(content, 'AI_CHAT_COMPONENTS_VERSIONS', true);
content = writeVersions(
  content,
  'AI_CHAT_VERSIONS',
  orderVersions([...publishedChat, `v${CHAT_VERSION}`])
);
content = writeVersions(
  content,
  'AI_CHAT_COMPONENTS_VERSIONS',
  orderVersions([
    ...(publishedComponents || [componentsFloor]),
    `v${COMPONENTS_VERSION}`,
  ]).filter(atOrAfterComponentsFloor)
);
fs.writeFileSync(file, content);
