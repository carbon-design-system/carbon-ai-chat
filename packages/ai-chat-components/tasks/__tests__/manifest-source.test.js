/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { readSource } from '../manifest-source.js';

const root = path.join(tmpdir(), 'manifest-source-fixtures');

function fixture(files, options = {}) {
  return readSource({ root, files, ...options });
}

function find(model, predicate) {
  let result;
  for (const source of model.sources) {
    model.visit(source, (node) => {
      if (!result && predicate(node)) {
        result = node;
      }
    });
  }
  assert.ok(result, 'The fixture must contain the requested source node.');
  return result;
}

function variable(model, name) {
  return find(
    model,
    (node) =>
      model.ts.isVariableDeclaration(node) && node.name.getText() === name
  );
}

function parameter(model, name) {
  return find(
    model,
    (node) => model.ts.isParameter(node) && node.name.getText() === name
  );
}

test('reads finite string expressions without evaluating fixture code', () => {
  const model = fixture({
    'src/values.ts': `
      const literal = 'literal';
      const suffix = ready ? 'open' : 'close';
      const duplicate = ready ? 'same' : 'same';
      const template = \`event-\${suffix}\`;
      const concatenated = 'event-' + suffix;
      const wrapped = (template as string)! satisfies string;
      const quotedTemplate = \`unchanging\`;
      const product = \`\${ready ? 'first' : 'second'}-\${suffix}\`;
      throw new Error('Source reading must not execute this module.');
    `,
  });

  for (const [name, expected] of [
    ['literal', ['literal']],
    ['duplicate', ['same']],
    ['template', ['event-open', 'event-close']],
    ['concatenated', ['event-open', 'event-close']],
    ['wrapped', ['event-open', 'event-close']],
    ['quotedTemplate', ['unchanging']],
    ['product', ['first-open', 'first-close', 'second-open', 'second-close']],
  ]) {
    assert.deepEqual(model.values(variable(model, name).initializer), expected);
  }
});

test('resolves aliases through default, named and family barrel reexports', () => {
  const model = fixture({
    'src/components/aichat-family/element.ts': `
      export const eventName = 'family-action';
      export default class Element { static is = 'family-element'; }
    `,
    'src/components/aichat-family/index.ts': `
      export { default as FamilyElement, eventName as actionEvent } from './element.js';
    `,
    'src/family.ts': `
      export { FamilyElement as PublicElement, actionEvent as publicEvent } from './components/aichat-family/index.js';
    `,
    'src/consumer.tsx': `
      import { PublicElement as WrapperElement, publicEvent as importedEvent } from './family.js';
      import DefaultElement from './components/aichat-family/element.js';
      const tag = WrapperElement.is;
      const defaultTag = DefaultElement.is;
      const event = importedEvent;
      const view = <WrapperElement data-name={event} />;
    `,
  });
  const element = model.elements[0];
  const wrapper = find(
    model,
    (node) =>
      model.ts.isImportSpecifier(node) && node.name.text === 'WrapperElement'
  );
  const defaultImport = find(
    model,
    (node) =>
      model.ts.isImportClause(node) && node.name?.text === 'DefaultElement'
  );

  assert.equal(model.symbol(wrapper.name), model.symbol(element.node.name));
  assert.equal(
    model.symbol(defaultImport.name),
    model.symbol(element.node.name)
  );
  assert.deepEqual(model.values(variable(model, 'tag').initializer), [
    'family-element',
  ]);
  assert.deepEqual(model.values(variable(model, 'defaultTag').initializer), [
    'family-element',
  ]);
  assert.deepEqual(model.values(variable(model, 'event').initializer), [
    'family-action',
  ]);
  assert.equal(
    model.ts.isJsxSelfClosingElement(variable(model, 'view').initializer),
    true
  );
});

test('discovers concrete static fields and getters with their source identity', () => {
  const model = fixture(
    {
      'src/globals/settings.ts': "export const prefix = 'cds';",
      'src/components/aichat-example/element.ts': `
        import { prefix as importedPrefix } from '../../globals/settings.js';
        const name = 'example';
        abstract class Base { static is = 'abstract-element'; }
        class Plain {}
        class InstanceOnly { is = 'instance-only'; }
        export class Field extends Base { static readonly is = 'field-element'; }
        export default class Getter {
          static get is() { return \`\${importedPrefix}-\${name}\`; }
        }
      `,
    },
    { prefix: 'alternate' }
  );

  assert.deepEqual(
    model.elements.map(({ tagName, className, module }) => ({
      tagName,
      className,
      module,
    })),
    [
      {
        tagName: 'field-element',
        className: 'Field',
        module: 'src/components/aichat-example/element.ts',
      },
      {
        tagName: 'alternate-example',
        className: 'Getter',
        module: 'src/components/aichat-example/element.ts',
      },
    ]
  );
  assert.match(
    model.elements[1].location,
    /^src\/components\/aichat-example\/element\.ts:\d+:\d+$/
  );
});

test('prefix overrides apply only to the canonical settings declaration', () => {
  const model = fixture(
    {
      'src/globals/settings.ts': "export const prefix = 'cds';",
      'src/other.ts': "export const prefix = 'unrelated';",
      'src/consumer.ts': `
        import { prefix } from './other.js';
        const result = \`\${prefix}-action\`;
      `,
    },
    { prefix: 'alternate' }
  );

  assert.deepEqual(model.values(variable(model, 'result').initializer), [
    'unrelated-action',
  ]);
});

test('resolves helper parameters from finite calls through imported aliases', () => {
  const model = fixture({
    'src/helper.ts': `
      export function emit(eventName: string) { return eventName; }
    `,
    'src/index.ts': "export { emit as send } from './helper.js';",
    'src/consumer.ts': `
      import { send as publish } from './index.js';
      publish('event-open');
      publish(ready ? 'event-close' : 'event-open');
    `,
  });

  assert.deepEqual(model.values(parameter(model, 'eventName').name), [
    'event-open',
    'event-close',
  ]);
});

test('resolves instance helper parameters using method symbols', () => {
  const model = fixture({
    'src/element.ts': `
      class Element {
        renderSlot(slotName: string) { return slotName; }
        render() { this.renderSlot('header'); this.renderSlot('footer'); }
      }
    `,
  });

  assert.deepEqual(model.values(parameter(model, 'slotName').name), [
    'header',
    'footer',
  ]);
});

test('resolves arrow helper and constructor parameters from their callsites', () => {
  const model = fixture({
    'src/helper.ts': `
      const emit = (eventName: string) => eventName;
      class Helper { constructor(slotName: string) {} }
      emit('event-action');
      new Helper('header');
      new Helper('footer');
    `,
  });

  assert.deepEqual(model.values(parameter(model, 'eventName').name), [
    'event-action',
  ]);
  assert.deepEqual(model.values(parameter(model, 'slotName').name), [
    'header',
    'footer',
  ]);
});

test('resolves shorthand properties to the imported value symbol', () => {
  const model = fixture({
    'src/event.ts': "export const eventName = 'event-action';",
    'src/consumer.ts': `
      import { eventName } from './event.js';
      const options = { eventName };
      const result = options.eventName;
    `,
  });
  const shorthand = find(model, model.ts.isShorthandPropertyAssignment);
  const declaration = variable(model, 'eventName');

  assert.equal(model.symbol(shorthand), model.symbol(declaration.name));
  assert.equal(model.symbol(shorthand.name), model.symbol(declaration.name));
  assert.deepEqual(model.values(variable(model, 'result').initializer), [
    'event-action',
  ]);
});

test('uses call arguments and defaults when resolving optional helper parameters', () => {
  const model = fixture({
    'src/helper.ts': `
      function emit(eventName = 'event-default') { return eventName; }
      emit('event-explicit');
      emit();
    `,
  });

  assert.deepEqual(model.values(parameter(model, 'eventName').name).sort(), [
    'event-default',
    'event-explicit',
  ]);
});

test('rejects an unknown callsite even when other helper calls are finite', () => {
  const model = fixture({
    'src/helper.ts': `
      function emit(eventName: string) { return eventName; }
      emit('event-known');
      emit(runtimeName);
    `,
  });

  assert.throws(
    () => model.values(parameter(model, 'eventName').name),
    /src\/helper\.ts:4:12: Unresolved contract expression: runtimeName\./
  );
});

test('rejects a missing required helper argument instead of dropping that callsite', () => {
  const model = fixture({
    'src/helper.ts': `
      function emit(eventName: string) { return eventName; }
      emit('event-known');
      emit();
    `,
  });

  assert.throws(
    () => model.values(parameter(model, 'eventName').name),
    /src\/helper\.ts:4:7: Missing contract argument: eventName\./
  );
});

test('rejects runtime expressions with an exact source diagnostic', () => {
  const model = fixture({
    'src/unknown.ts': 'const runtime = getName();\nconst eventName = runtime;',
  });

  assert.throws(
    () => model.values(variable(model, 'eventName').initializer),
    /src\/unknown\.ts:1:17: Unresolved contract expression: getName\(\)\./
  );
});

test('rejects circular source constants', () => {
  const model = fixture({
    'src/circular.ts': 'const first = second; const second = first;',
  });

  assert.throws(
    () => model.values(variable(model, 'first').initializer),
    /src\/circular\.ts:1:\d+: Circular contract expression\./
  );
});

test('rejects multiple possible element names', () => {
  assert.throws(
    () =>
      fixture({
        'src/element.ts': `
          class Element {
            static get is() { return ready ? 'first-element' : 'second-element'; }
          }
        `,
      }),
    /src\/element\.ts:3:\d+: An element needs one static tag name\./
  );
});

test('rejects a getter whose conditional returns disagree', () => {
  assert.throws(
    () =>
      fixture({
        'src/element.ts': `
          class Element {
            static get is() {
              if (ready) return 'first-element';
              return 'second-element';
            }
          }
        `,
      }),
    /src\/element\.ts:\d+:\d+:/
  );
});

test('fails unknown static tags instead of omitting the element', () => {
  assert.throws(
    () =>
      fixture({
        'src/element.ts':
          'class Element { static get is() { return runtimeName; } }',
      }),
    /src\/element\.ts:1:\d+: Unresolved contract expression: runtimeName\./
  );
});

test('loads ambient declarations into the program without treating them as source contracts', () => {
  const model = fixture({
    'src/typings/resources.d.ts': `
      declare module '*.scss?lit' { const styles: string; export default styles; }
    `,
    'src/element.ts': `
      import styles from './element.scss?lit';
      export const result: string = styles;
    `,
  });

  assert.deepEqual(
    model.program.getSemanticDiagnostics().map((entry) => entry.messageText),
    []
  );
  assert.equal(model.sources.length, 1);
  assert.match(model.sources[0].fileName, /src\/element\.ts$/);
});

test('default discovery includes canonical source and ambient types without legacy or story inventory', () => {
  const directory = mkdtempSync(
    path.join(tmpdir(), 'manifest-source-discovery-')
  );
  const included = [
    'src/index.ts',
    'src/components/aichat-example/element.ts',
    'src/components/shared/helper.ts',
    'src/globals/settings.ts',
    'src/react/example.tsx',
    'src/testing/helper.ts',
    'src/typings/public.ts',
  ];
  const excluded = [
    'src/components/example/src/legacy.ts',
    'src/components/aichat-example/__stories__/example.ts',
    'src/components/aichat-example/__tests__/example.ts',
    'src/components/aichat-example/element.test.ts',
    'src/components/aichat-example/element.stories.ts',
    'src/components/aichat-example/element.scss.ts',
    'src/components/aichat-example/element.d.ts',
    'src/globals/internal/storybook-cdn.ts',
  ];
  try {
    for (const filename of [
      ...included,
      ...excluded,
      'src/typings/resources.d.ts',
    ]) {
      const file = path.join(directory, filename);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, 'export {};');
    }
    const model = readSource({ root: directory });

    assert.deepEqual(
      model.sources
        .map((source) => path.relative(directory, source.fileName))
        .sort(),
      included.sort()
    );
    assert.ok(
      model.program.getSourceFile(
        path.join(directory, 'src/typings/resources.d.ts')
      )
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('rejects reassigned contract variables instead of trusting the initializer', () => {
  const model = fixture({
    'src/changed.ts': `
      let eventName = 'event-known';
      eventName = runtimeName;
      const result = eventName;
    `,
  });

  assert.throws(
    () => model.values(variable(model, 'result').initializer),
    /src\/changed\.ts:3:\d+: Assigned contract value cannot be resolved statically: eventName\./
  );
});

test('rejects changed object properties without confusing unrelated symbols', () => {
  const model = fixture({
    'src/changed.ts': `
      const options = { eventName: 'event-known' };
      const other = { eventName: 'other-event' };
      options.eventName = runtimeName;
      const changed = options.eventName;
      const unchanged = other.eventName;
    `,
  });

  assert.throws(
    () => model.values(variable(model, 'changed').initializer),
    /Assigned contract value cannot be resolved statically: options\.eventName\./
  );
  assert.deepEqual(model.values(variable(model, 'unchanged').initializer), [
    'other-event',
  ]);
});
