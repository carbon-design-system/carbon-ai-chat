/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { Window } from 'happy-dom';
import { createDocsManifest } from '../../.storybook/docs-manifest.js';

const previousWindow = global.window;
const window = new Window();
global.window = window;
const { setCustomElementsManifest } =
  await import('@storybook/web-components-vite');
const { parameters, argTypesEnhancers } =
  await import('@storybook/web-components/entry-preview-argtypes');
const extractArgTypes = parameters.docs.extractArgTypes;

after(async () => {
  await window.happyDOM.close();
  if (previousWindow === undefined) {
    delete global.window;
  } else {
    global.window = previousWindow;
  }
});

function fixture() {
  return {
    schemaVersion: '1.0.0',
    modules: [
      {
        declarations: [
          {
            tagName: 'example-card',
            members: [
              {
                kind: 'field',
                name: 'title',
                description: 'The property title.',
                type: { text: 'string' },
                default: "'Heading'",
              },
              { kind: 'field', name: 'input', privacy: 'private' },
              { kind: 'field', name: 'is', static: true },
              { kind: 'method', name: 'focus' },
            ],
            attributes: [
              {
                name: 'title',
                fieldName: 'title',
                description: 'The attribute title.',
                type: { text: 'string' },
                default: "'Heading'",
              },
            ],
            slots: [
              { name: 'title', description: 'The slot title.' },
              { name: 'slot:title', description: 'A literal prefixed slot.' },
              { name: 'input', description: 'Public slotted input.' },
              { name: '', description: 'Default content.' },
            ],
            events: [
              {
                name: 'selected',
                description: 'The selection changes.',
                type: { text: 'CustomEvent<SelectionDetail>' },
              },
            ],
          },
        ],
      },
    ],
  };
}

function prepare(source = fixture()) {
  const docs = createDocsManifest(source, extractArgTypes);
  setCustomElementsManifest(docs.manifest);
  return docs;
}

test('keeps colliding fields and slots through the installed renderer extractor', () => {
  const source = fixture();
  const original = structuredClone(source);
  setCustomElementsManifest(source);
  assert.equal(extractArgTypes('example-card').title.table.category, 'slots');

  const docs = prepare(source);
  const rows = docs.extractArgTypes('example-card');
  assert.equal(rows.title.description, 'The attribute title.');
  assert.equal(rows.title.table.category, 'attributes');
  assert.equal(rows.title.table.type.summary, 'string');
  assert.equal(rows.title.table.defaultValue.summary, "'Heading'");
  assert.equal(rows['slot:slot:title'].name, 'title');
  assert.equal(rows['slot:slot:title'].description, 'The slot title.');
  assert.equal(rows['slot:slot:title'].table.category, 'slots');
  assert.equal(rows['slot:title'].name, 'slot:title');
  assert.equal(rows['slot:title'].description, 'A literal prefixed slot.');
  assert.equal(rows.input.table.category, 'slots');
  assert.equal(rows.is, undefined);
  assert.equal(rows.focus, undefined);
  assert.deepEqual(source, original);
});

test('preserves manual value controls, defaults, and Actions after extraction', () => {
  const docs = prepare();
  const manual = {
    title: {
      description: 'Story help for the title.',
      control: { type: 'text' },
      table: { defaultValue: { summary: 'Story heading' } },
    },
    onSelected: { action: 'selection', table: { disable: true } },
  };
  const original = structuredClone(manual);
  const rows = argTypesEnhancers[0]({
    component: 'example-card',
    argTypes: manual,
    parameters: { docs: { extractArgTypes: docs.extractArgTypes } },
  });
  assert.deepEqual(rows.title.control, { type: 'text' });
  assert.equal(rows.title.description, 'Story help for the title.');
  assert.equal(rows.title.table.defaultValue.summary, 'Story heading');
  assert.equal(rows.title.table.category, 'attributes');
  assert.equal(rows['slot:slot:title'].description, 'The slot title.');
  assert.equal(rows.onSelected.action, 'selection');
  assert.equal(rows.onSelected.table.disable, true);
  assert.equal(rows.selected.description, 'The selection changes.');
  assert.equal(
    rows.selected.table.type.summary,
    'CustomEvent<SelectionDetail>'
  );
  assert.deepEqual(manual, original);
});

test('leaves noncolliding renderer rows unchanged', () => {
  const source = fixture();
  const declaration = source.modules[0].declarations[0];
  declaration.members = declaration.members.slice(0, 1);
  declaration.slots = [{ name: 'body', description: 'The body content.' }];
  setCustomElementsManifest(source);
  const expected = extractArgTypes('example-card');
  const docs = prepare(source);
  assert.deepEqual(docs.extractArgTypes('example-card'), expected);
});
