/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { create, ts } from '@custom-elements-manifest/analyzer';
import { globby } from 'globby';
import { litPlugin } from '@custom-elements-manifest/analyzer/src/features/framework-plugins/lit/lit.js';
import config from '../../custom-elements-manifest.config.js';

const packageRoot = fileURLToPath(new URL('../../', import.meta.url));
const sourceDir = 'src/components/aichat-prompt-line';

function parse(file) {
  return ts.createSourceFile(
    file,
    readFileSync(path.join(packageRoot, file), 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
}

function insideDispatchHelper(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (
      ts.isMethodDeclaration(parent) &&
      parent.name.getText() === '_dispatch'
    ) {
      return true;
    }
  }
  return false;
}

// Names passed to `new CustomEvent(...)` or a runtime's `this._dispatch(...)`.
// Identifiers resolve against string constants in the same file. The `name`
// parameter inside `_dispatch` is skipped; any other name the test can't read
// lands in `unresolved`, so a new pattern fails here instead of going unchecked.
function dispatchedEvents(sourceFile) {
  const constants = new Map();
  const nameArgs = [];
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      constants.set(node.name.text, node.initializer.text);
    }
    if (
      (ts.isNewExpression(node) || ts.isCallExpression(node)) &&
      ['CustomEvent', 'this._dispatch'].includes(
        node.expression.getText(sourceFile)
      ) &&
      node.arguments?.length
    ) {
      nameArgs.push(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  const names = [];
  const unresolved = [];
  for (const arg of nameArgs) {
    if (ts.isStringLiteral(arg)) {
      names.push(arg.text);
    } else if (ts.isIdentifier(arg) && constants.has(arg.text)) {
      names.push(constants.get(arg.text));
    } else if (!insideDispatchHelper(arg)) {
      unresolved.push(`${sourceFile.fileName}: ${arg.getText(sourceFile)}`);
    }
  }
  return { names, unresolved };
}

// Event names in the `events` map handed to `createComponent`.
function wrapperEvents(sourceFile) {
  const names = [];
  const visit = (node) => {
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(sourceFile) === 'events' &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      for (const property of node.initializer.properties) {
        names.push(
          ts.isPropertyAssignment(property) &&
            ts.isStringLiteral(property.initializer)
            ? property.initializer.text
            : property.getText(sourceFile)
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return names;
}

const unique = (names) => [...new Set(names)].sort();

test('prompt line @fires tags match its dispatch sites and React wrapper', async () => {
  const files = await globby(
    [
      `${sourceDir}/aichat-prompt-line.ts`,
      `${sourceDir}/prompt-line*.ts`,
      `${sourceDir}/tiptap/*.ts`,
    ],
    { cwd: packageRoot }
  );
  const scans = files.map((file) => dispatchedEvents(parse(file)));
  assert.deepEqual(
    scans.flatMap((scan) => scan.unresolved),
    [],
    'Use a string literal or a same-file constant for each event name.'
  );
  const dispatched = unique(scans.flatMap((scan) => scan.names));

  const manifest = create({
    modules: [parse(`${sourceDir}/aichat-prompt-line.ts`)],
    plugins: [...litPlugin(), ...config.plugins],
  });
  const element = manifest.modules[0].declarations.find(
    (entry) => entry.tagName === 'cds-aichat-prompt-line'
  );
  assert.ok(element, 'The manifest has no cds-aichat-prompt-line entry.');
  const events = element.events ?? [];
  const fired = unique(events.map((event) => event.name));

  assert.deepEqual(
    fired,
    dispatched,
    'The @fires tags on PromptLineElement must match the events it dispatches.'
  );
  assert.deepEqual(
    events.filter((event) => !event.description).map((event) => event.name),
    [],
    'Each event needs a @fires description.'
  );
  assert.deepEqual(
    unique(wrapperEvents(parse('src/react/prompt-line.tsx'))),
    fired,
    'The React wrapper events map must match the @fires tags.'
  );
  // The class comment says both modes share the cds-aichat-prompt-* events
  // and the rest are rich mode only.
  assert.deepEqual(
    unique(
      dispatchedEvents(parse(`${sourceDir}/prompt-line-textarea-runtime.ts`))
        .names
    ),
    fired.filter((name) => name.startsWith('cds-aichat-prompt-')),
    'Textarea mode must fire exactly the cds-aichat-prompt-* events.'
  );
});
