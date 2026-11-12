/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { create, ts } from '@custom-elements-manifest/analyzer';
import { litPlugin } from '@custom-elements-manifest/analyzer/src/features/framework-plugins/lit/lit.js';
import {
  carbonElementTagPlugin,
  componentModulePathsPlugin,
} from '../cem-plugins.js';
import { readSource } from '../manifest-source.js';
import { manifestEventsPlugin } from '../manifest-events-plugin.js';
import { validateEvents } from '../manifest-events.js';

const filename = 'src/components/aichat-example/aichat-example.ts';
const text = `
  export interface Detail { value: string; }
  /**
   * @fires {CustomEvent<Detail>} example-change - Reports a changed value.
   */
  export default class Example extends HTMLElement {
    static get is() { return 'fixture-aichat-example'; }
    static get eventChange() { return 'example-change'; }
    emit() {
      this.dispatchEvent(new CustomEvent<Detail>(
        (this.constructor as typeof Example).eventChange,
        { detail: { value: 'changed' }, bubbles: true, composed: true }
      ));
    }
  }
`;

function analyze(model, before = []) {
  return create({
    modules: model.sources.map((entry) =>
      ts.createSourceFile(
        path.relative(model.root, entry.fileName),
        entry.text,
        ts.ScriptTarget.Latest,
        true
      )
    ),
    plugins: [
      ...litPlugin(),
      carbonElementTagPlugin({ prefix: 'fixture' }),
      componentModulePathsPlugin(),
      ...before,
      manifestEventsPlugin({ model }),
    ],
  });
}

function fixture(source = text, before) {
  const model = readSource({ files: { [filename]: source } });
  return { model, manifest: analyze(model, before) };
}

function element(manifest) {
  return manifest.modules
    .flatMap((module) => module.declarations ?? [])
    .find((entry) => entry.tagName === 'fixture-aichat-example');
}

test('normalizes analyzer computed-constructor rows into the named source event', () => {
  const { model, manifest } = fixture();
  assert.deepEqual(
    element(manifest).events.map((entry) => entry.name),
    ['example-change']
  );
  assert.equal(
    element(manifest).events[0].description,
    'Reports a changed value.'
  );
  assert.doesNotThrow(() => validateEvents(model, manifest));
});

test('assigns a resolved computed name without manufacturing source event metadata', () => {
  const { model, manifest } = fixture(
    text.replace(/^\s*\* @fires[^\n]*\n/m, '')
  );
  assert.deepEqual(
    element(manifest).events.map((entry) => entry.name),
    ['example-change']
  );
  assert.throws(
    () => validateEvents(model, manifest),
    /example-change.*@fires/
  );
});

test('does not hide a malformed authored fires tag when computed dispatch is resolvable', () => {
  assert.throws(() => {
    const { model, manifest } = fixture(
      text.replace(
        '* @fires {CustomEvent<Detail>} example-change - Reports a changed value.',
        '* @fires {CustomEvent<Detail>} example-change - Reports a changed value.\n   * @fires {CustomEvent<Detail>}'
      )
    );
    validateEvents(model, manifest);
  }, /name|<unnamed>|@fires|type|description/);
});

test('fails an unresolved computed source name instead of dropping its nameless row', () => {
  assert.throws(
    () =>
      fixture(
        text.replace(
          '(this.constructor as typeof Example).eventChange,',
          'runtimeEventName,'
        )
      ),
    /aichat-example\.ts:\d+:\d+.*Unresolved/
  );
});

test('fails a nameless manifest event with no computed source producer', () => {
  assert.throws(
    () =>
      fixture(
        text.replace(
          '(this.constructor as typeof Example).eventChange,',
          "'example-change',"
        ),
        [
          {
            name: 'unexplained-nameless-row',
            packageLinkPhase({ customElementsManifest }) {
              element(customElementsManifest).events.push({
                type: { text: 'CustomEvent<Detail>' },
              });
            },
          },
        ]
      ),
    /aichat-example\.ts:\d+:\d+.*concrete source producer/
  );
});

test('does not merge unexplained unnamed metadata merely because a computed producer exists', () => {
  for (const row of [
    {
      type: { text: 'CustomEvent' },
      description: 'An unrelated authored entry.',
    },
    { type: { text: 'CustomEvent<Detail>' } },
    { type: { text: 'CustomEvent' }, deprecated: true },
  ]) {
    assert.throws(
      () =>
        fixture(text, [
          {
            name: 'unexplained-unnamed-metadata',
            packageLinkPhase({ customElementsManifest }) {
              element(customElementsManifest).events.push(row);
            },
          },
        ]),
      /aichat-example\.ts:\d+:\d+.*analyzer-shaped concrete source producer/
    );
  }
});

test('normalizes finite computed names without creating repeated element event pairs', () => {
  const { model, manifest } = fixture(
    text
      .replace(
        '* @fires {CustomEvent<Detail>} example-change - Reports a changed value.',
        '* @fires {CustomEvent<Detail>} example-change - Reports a changed value.\n   * @fires {CustomEvent<Detail>} example-other - Reports a second value.'
      )
      .replace(
        "static get eventChange() { return 'example-change'; }",
        `
      static get eventChange() { return 'example-change'; }
      static get eventOther() { return 'example-other'; }
    `
      )
      .replace(
        '    emit() {',
        `
      emitOther() {
        this.dispatchEvent(new CustomEvent<Detail>((this.constructor as typeof Example).eventOther, {
          detail: { value: 'second' }, bubbles: true, composed: true,
        }));
      }
      emit() {
    `
      )
  );
  assert.deepEqual(
    element(manifest)
      .events.map((entry) => entry.name)
      .sort(),
    ['example-change', 'example-other']
  );
  assert.doesNotThrow(() => validateEvents(model, manifest));
});
