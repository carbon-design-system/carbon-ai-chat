/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readSource } from '../manifest-source.js';
import { fireTags, readEvents } from '../manifest-events.js';
import { validateEventTypes } from '../manifest-event-types.js';

test('the source model resolves native browser event types', () => {
  const model = readSource();
  const source = model.sources.find((entry) =>
    entry.fileName.endsWith('/codemirror/marker-utils.ts')
  );
  let argument;
  model.visit(source, (node) => {
    if (
      model.ts.isVariableDeclaration(node) &&
      node.name.getText() === 'mouseEvent'
    ) {
      argument = node.name;
    }
  });
  const type = model.checker.getTypeAtLocation(argument);
  assert.equal(type.flags & model.ts.TypeFlags.Any, 0);
  assert.equal(model.checker.typeToString(type), 'MouseEvent');
});

function fixture(
  body,
  {
    contract = 'CustomEvent<Detail>',
    declarations = '',
    extra = {},
    tags = '',
  } = {}
) {
  const model = readSource({
    files: {
      'src/element.ts': `
        interface Detail { value: string; }
        ${declarations}
        /**
         * @fires {${contract}} example-change - The value changes.
         * ${tags}
         */
        class Element extends EventTarget {
          static is = 'fixture-element';
          ${body}
        }
      `,
      ...extra,
    },
  });
  const producers = readEvents(model);
  const pairs = model.elements.flatMap((element) =>
    fireTags(model, element.node).map((tag) => ({
      element,
      name: tag.name,
      type: tag.type,
      description: tag.description,
      producer: producers.find((producer) => producer.name === tag.name),
    }))
  );
  return {
    model,
    producers,
    pairs,
    errors: validateEventTypes(model, producers, pairs),
  };
}

test('validates named detail contracts and ignores unrelated source errors', () => {
  const { errors } = fixture(
    `
    emit() { this.dispatchEvent(new CustomEvent<Detail>('example-change', { detail: { value: 'next' } })); }
  `,
    { declarations: 'const unrelated: string = 12;' }
  );

  assert.deepEqual(errors, []);
});

test('resolves imported type aliases from the public element context', () => {
  const { errors } = fixture(
    `
    emit() { this.dispatchEvent(new CustomEvent<ImportedDetail>('example-change', { detail: { value: 'next' } })); }
  `,
    {
      contract: 'CustomEvent<ImportedDetail>',
      declarations:
        "import type { PublicDetail as ImportedDetail } from './detail.js';",
      extra: {
        'src/detail.ts': 'export interface PublicDetail { value: string; }',
      },
    }
  );

  assert.deepEqual(errors, []);
});

test('validates union and null details without changing native event types', () => {
  const { errors } = fixture(
    `
    emit() {
      this.dispatchEvent(new CustomEvent<Detail | null>('example-change', { detail: null }));
      this.dispatchEvent(new CustomEvent<Detail | null>('example-change', { detail: { value: 'next' } }));
    }
  `,
    { contract: 'CustomEvent<Detail | null>' }
  );

  assert.deepEqual(errors, []);
  assert.deepEqual(
    fixture(
      "emit() { this.dispatchEvent(new CustomEvent<null>('example-change')); }",
      { contract: 'CustomEvent<null>' }
    ).errors,
    []
  );
});

test('rejects every mismatched producer even when another producer is correct', () => {
  const { producers, errors } = fixture(
    `
    emit() {
      this.dispatchEvent(new CustomEvent<Detail>('example-change', { detail: { value: 'next' } }));
      this.dispatchEvent(new CustomEvent<OtherDetail>('example-change', { detail: { count: 1 } }));
    }
  `,
    { declarations: 'interface OtherDetail { count: number; }' }
  );

  assert.equal(producers.length, 2);
  assert.ok(errors.some((error) => /producer detail type differs/.test(error)));
  assert.ok(errors.every((error) => /^src\/element\.ts:\d+:\d+:/.test(error)));
});

test('requires an explicit generic or a checked satisfies payload', () => {
  assert.match(
    fixture(`
    emit() { this.dispatchEvent(new CustomEvent('example-change', { detail: { value: 'next' } })); }
  `).errors.join('\n'),
    /explicit CustomEvent detail type/
  );
  assert.deepEqual(
    fixture(`
    emit() { this.dispatchEvent(new CustomEvent('example-change', { detail: { value: 'next' } satisfies Detail })); }
  `).errors,
    []
  );
});

test('rejects unresolved and unsupported public detail contracts', () => {
  const body =
    "emit() { this.dispatchEvent(new CustomEvent<Detail>('example-change', { detail: { value: 'next' } })); }";

  assert.match(
    fixture(body, { contract: 'CustomEvent<MissingDetail>' }).errors.join('\n'),
    /Unresolved public detail type MissingDetail/
  );
  assert.match(
    fixture(body, { contract: 'CustomEvent<{ value: string }>' }).errors.join(
      '\n'
    ),
    /Unsupported public detail contract/
  );
  assert.match(
    fixture(body, { contract: 'CustomEvent<any>' }).errors.join('\n'),
    /Unsupported public detail contract|Unsupported detail type/
  );
});

test('rejects wrong actual payloads and any-based bypasses', () => {
  const invalid = fixture(`
    emit() { this.dispatchEvent(new CustomEvent<Detail>('example-change', { detail: { value: 12 } })); }
  `).errors.join('\n');
  const bypass = fixture(`
    emit() { this.dispatchEvent(new CustomEvent<Detail>('example-change', { detail: undefined as any })); }
  `).errors.join('\n');

  assert.match(invalid, /Invalid event producer:.*number.*string/s);
  assert.match(invalid, /payload does not match/);
  assert.match(bypass, /cannot bypass/);
  assert.match(bypass, /Unsupported detail type any/);
});

test('checks referenced payload initializers while excluding unrelated statements', () => {
  const { errors } = fixture(`
    emit() {
      const detail: Detail = { value: 12 };
      this.dispatchEvent(new CustomEvent<Detail>('example-change', { detail }));
    }
  `);

  assert.match(errors.join('\n'), /Invalid event producer:.*number.*string/s);
});

test('rejects a missing non-null payload even though CustomEventInit makes detail optional', () => {
  const { errors } = fixture(
    "emit() { this.dispatchEvent(new CustomEvent<Detail>('example-change')); }"
  );

  assert.match(errors.join('\n'), /needs its declared detail payload/);
});

const helper = `
  private _dispatch<Name extends keyof Details>(name: Name, detail?: Details[Name]) {
    this.dispatchEvent(new CustomEvent<Details[Name]>(name, { detail }));
  }
`;
const helperOptions = {
  declarations:
    "interface Details { 'example-change': Detail; 'example-clear': null; }",
  tags: '@fires {CustomEvent<null>} example-clear - The value clears.',
};

test('specializes generic helper maps by finite event names and validates each payload', () => {
  const { producers, errors } = fixture(
    `
    ${helper}
    emit() { this._dispatch('example-change', { value: 'next' }); this._dispatch('example-clear'); }
  `,
    helperOptions
  );

  assert.equal(producers.length, 2);
  assert.deepEqual(errors, []);
});

test('checks generic helper callsite diagnostics and missing required payloads', () => {
  const invalid = fixture(
    `
    ${helper}
    emit() { this._dispatch('example-change', { value: 12 }); this._dispatch('example-clear'); }
  `,
    helperOptions
  ).errors.join('\n');
  const missing = fixture(
    `
    ${helper}
    emit() { this._dispatch('example-change'); this._dispatch('example-clear'); }
  `,
    helperOptions
  ).errors.join('\n');

  assert.match(invalid, /Invalid event producer:.*number.*string/s);
  assert.match(missing, /example-change needs its declared detail payload/);
});

test('validates exported protocol producers against their own typed fires metadata', () => {
  const model = readSource({
    files: {
      'src/protocol.ts': `
      interface Detail { value: string; }
      /**
       * @eventProtocol
       * @fires {CustomEvent<Detail>} example-protocol - Projects content.
       */
      export function send(target: EventTarget) {
        target.dispatchEvent(new CustomEvent<Detail>('example-protocol', { detail: { value: 'next' } }));
      }
    `,
    },
  });
  const producers = readEvents(model);

  assert.equal(producers.length, 1);
  assert.deepEqual(validateEventTypes(model, producers, []), []);
});

test('preserves native published event types without requiring CustomEvent details', () => {
  assert.deepEqual(
    fixture("emit() { this.dispatchEvent(new Event('example-change')); }", {
      contract: 'Event',
    }).errors,
    []
  );
  assert.deepEqual(
    fixture(
      "emit() { this.dispatchEvent(new MouseEvent('example-change', { clientX: 1 })); }",
      { contract: 'MouseEvent' }
    ).errors,
    []
  );
  assert.match(
    fixture(
      "emit() { this.dispatchEvent(new MouseEvent('example-change')); }",
      { contract: 'KeyboardEvent' }
    ).errors.join('\n'),
    /differs/
  );
});

test('uses concrete pair producer associations for reexposed event types', () => {
  const { model, producers, pairs } = fixture(
    "emit() { this.dispatchEvent(new CustomEvent<Detail>('example-change', { detail: { value: 'next' } })); }"
  );
  const unrelated = {
    ...pairs[0],
    type: 'CustomEvent<null>',
    producers: [],
  };
  const related = { ...pairs[0], producers: producers };

  assert.deepEqual(
    validateEventTypes(model, producers, [unrelated, related]),
    []
  );
  assert.match(
    validateEventTypes(model, producers, [
      { ...unrelated, type: 'CustomEvent<MissingDetail>', producers },
    ]).join('\n'),
    /Unresolved public detail type/
  );
});

test('validates wrapper-only public contracts when no local producer exists', () => {
  const model = readSource({
    files: {
      'src/element.ts': `
      interface Detail { value: string; }
      class Element extends EventTarget { static is = 'fixture-element'; }
    `,
    },
  });
  const pair = {
    element: model.elements[0],
    name: 'external-change',
    producers: [],
  };

  assert.deepEqual(
    validateEventTypes(model, [], [{ ...pair, type: 'CustomEvent<Detail>' }]),
    []
  );
  assert.deepEqual(
    validateEventTypes(model, [], [{ ...pair, type: 'Event' }]),
    []
  );
  assert.match(
    validateEventTypes(
      model,
      [],
      [{ ...pair, type: 'CustomEvent<DoesNotExist>' }]
    ).join('\n'),
    /src\/element\.ts:\d+:\d+: external-change: Unresolved public detail type DoesNotExist/
  );
});

test('keeps fixed indexed types distinct from event-name-specialized helper maps', () => {
  const { errors } = fixture(
    `
    emit() { this.dispatchEvent(new CustomEvent<Details['other']>('example-change', { detail: { count: 1 } })); }
  `,
    {
      declarations:
        "interface Details { 'example-change': Detail; other: { count: number }; }",
    }
  );

  assert.match(errors.join('\n'), /producer detail type differs/);
});
