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
import { readWrappers } from '../manifest-wrappers.js';
import { readEvents, validateEvents } from '../manifest-events.js';
import { manifestEventsPlugin } from '../manifest-events-plugin.js';

const elementPath = 'src/components/aichat-example/aichat-example.ts';
const source = `
  export interface ChangeDetail { value: string; }
  /**
   * @element fixture-aichat-example
   * @fires {CustomEvent<ChangeDetail>} example-change - Contains the updated value.
   */
  export default class Example extends HTMLElement {
    static get is() { return 'fixture-aichat-example'; }
    static get eventChange() { return 'example-change'; }
    emit = () => {
      const event = new CustomEvent<ChangeDetail>(Example.eventChange, {
        detail: { value: 'first' }, bubbles: true, composed: true,
      });
      this.dispatchEvent(event);
    };
  }
`;

function analyze(model) {
  let prefix = 'fixture';
  const settings = model.sources.find((entry) =>
    entry.fileName.endsWith('/src/globals/settings.ts')
  );
  if (settings) {
    model.visit(settings, (node) => {
      if (
        model.ts.isVariableDeclaration(node) &&
        node.name.getText() === 'prefix'
      ) {
        [prefix] = model.values(node.initializer);
      }
    });
  }
  return create({
    modules: model.sources.map((entry) =>
      ts.createSourceFile(
        path.relative(model.root, entry.fileName),
        entry.text,
        ts.ScriptTarget.Latest,
        true,
        entry.fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      )
    ),
    plugins: [
      ...litPlugin(),
      carbonElementTagPlugin({ prefix }),
      componentModulePathsPlugin(),
      manifestEventsPlugin({ model }),
    ],
  });
}

function fixture(text = source, extra = {}) {
  const model = readSource({
    files: {
      [elementPath]: text,
      'src/components/aichat-example/index.ts': `
        export { default as Example } from './aichat-example.js';
        export type { ChangeDetail } from './aichat-example.js';
      `,
      ...extra,
    },
    prefix: 'fixture',
  });
  return { model, manifest: analyze(model) };
}

function validate({ model, manifest }) {
  return validateEvents(model, manifest, readWrappers(model));
}

function rejects(input, message) {
  assert.throws(
    () => validate(typeof input === 'function' ? input() : input),
    (error) => {
      assert.match(error.message, /src\/[^\n]+\.tsx?:\d+:\d+/);
      assert.match(error.message, message);
      return true;
    }
  );
}

test('reads arrow handlers, local events, optional dispatch and static names with analyzer metadata', () => {
  const input = fixture(
    source.replace('this.dispatchEvent(event)', 'this?.dispatchEvent(event)')
  );
  const result = validate(input);
  assert.equal(result.producers.length, 1);
  assert.equal(result.producers[0].name, 'example-change');
  assert.equal(result.producers[0].element.className, 'Example');
  assert.equal(result.producers[0].bubbles, true);
  assert.equal(result.producers[0].composed, true);
  assert.equal(result.pairs[0].type, 'CustomEvent<ChangeDetail>');
  assert.equal(result.pairs[0].description, 'Contains the updated value.');
});

test('requires a source event name, useful type and description independently', () => {
  for (const [original, replacement, message] of [
    ['example-change - Contains', '- Contains', /example-change|name/i],
    ['{CustomEvent<ChangeDetail>} ', '', /type/i],
    ['Contains the updated value.', '', /description/i],
    [
      'CustomEvent<ChangeDetail>} example-change',
      'CustomEvent} example-change',
      /type/i,
    ],
    [
      'CustomEvent<ChangeDetail>} example-change',
      'CustomEvent<any>} example-change',
      /type/i,
    ],
  ]) {
    rejects(() => fixture(source.replace(original, replacement)), message);
  }
});

test('requires the generated event row even when source metadata is complete', () => {
  const input = fixture();
  const declaration = input.manifest.modules
    .flatMap((module) => module.declarations ?? [])
    .find((entry) => entry.tagName === 'fixture-aichat-example');
  declaration.events = [];
  rejects(input, /Missing manifest entry.*example-change/);
});

test('rejects repeated source tags even if the analyzer coalesces them', () => {
  const tag =
    '* @fires {CustomEvent<ChangeDetail>} example-change - Contains the updated value.';
  rejects(
    fixture(source.replace(tag, `${tag}\n   ${tag}`)),
    /Repeated.*example-change/
  );
});

test('rejects repeated generated rows and undocumented phantom events', () => {
  const input = fixture();
  const declaration = input.manifest.modules
    .flatMap((module) => module.declarations ?? [])
    .find((entry) => entry.tagName === 'fixture-aichat-example');
  declaration.events.push({ ...declaration.events[0] });
  rejects(input, /Repeated.*example-change/);
  rejects(
    fixture(
      source.replace(
        '* @element fixture-aichat-example',
        '* @element fixture-aichat-example\n   * @fires {CustomEvent<ChangeDetail>} phantom-event - Never emitted or re-exposed.'
      )
    ),
    /Unjustified.*phantom-event/
  );
});

test('fails unresolved public event names and unknown targets with source locations', () => {
  rejects(
    () =>
      fixture(source.replace('Example.eventChange, {', 'runtimeEventName, {')),
    /Unresolved.*runtimeEventName/
  );
  rejects(
    () =>
      fixture(
        source.replace(
          'this.dispatchEvent(event)',
          'unknownTarget.dispatchEvent(event)'
        )
      ),
    /Unresolved public event owner.*unknownTarget/
  );
});

test('resolves finite helper names while keeping producer ownership on the declared element', () => {
  const input = fixture(
    source.replace(
      /emit = \(\) => \{[\s\S]*?\n {4}\};/,
      `emit = () => emitPublicEvent(this, Example.eventChange);`
    ) +
      `
    /** @eventOwner {Example} */
    function emitPublicEvent(target: EventTarget, name: string) {
      target.dispatchEvent(new CustomEvent<ChangeDetail>(name, {
        detail: { value: 'from helper' }, bubbles: true, composed: true,
      }));
    }
  `
  );
  const result = validate(input);
  assert.equal(result.producers.length, 1);
  assert.equal(result.producers[0].element.className, 'Example');
  assert.equal(result.producers[0].name, 'example-change');
});

test('rejects wrong payload fields against the public event detail type', () => {
  rejects(
    fixture(source.replace("value: 'first'", 'value: 42')),
    /type|detail|payload|assignable/i
  );
});

test('rejects a valid producer generic that disagrees with its public metadata type', () => {
  rejects(
    fixture(
      source
        .replace(
          'export interface ChangeDetail { value: string; }',
          'export interface ChangeDetail { value: string; }\nexport interface OtherDetail { value: number; }'
        )
        .replace(
          'new CustomEvent<ChangeDetail>',
          'new CustomEvent<OtherDetail>'
        )
        .replace("value: 'first'", 'value: 42')
    ),
    /type|detail|payload|assignable|differs/i
  );
});

test('keeps native internal DOM dispatch outside the public custom-event inventory', () => {
  const input = fixture(
    source +
      `
      function exerciseButton(button: HTMLButtonElement) {
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      }
    `
  );
  assert.deepEqual(
    readEvents(input.model).map((entry) => entry.name),
    ['example-change']
  );
  assert.doesNotThrow(() => validate(input));
});

test('keeps directly dispatched native element events and their native metadata types', () => {
  const text = source
    .replace(
      '* @element fixture-aichat-example',
      '* @element fixture-aichat-example\n   * @fires {MouseEvent} example-click - Reports a native pointer click.'
    )
    .replace(
      'this.dispatchEvent(event);',
      `
      this.dispatchEvent(event);
      this.dispatchEvent(new MouseEvent('example-click', { bubbles: true, composed: true }));
    `
    );
  const input = fixture(text);
  const result = validate(input);
  assert.equal(
    result.producers.find((entry) => entry.name === 'example-click').custom,
    false
  );
  assert.equal(
    result.pairs.find((entry) => entry.name === 'example-click').type,
    'MouseEvent'
  );
  rejects(
    fixture(text.replace('@fires {MouseEvent}', '@fires {KeyboardEvent}')),
    /type|native|assignable/i
  );
  rejects(
    fixture(text.replace(/^\s*\*\s*@fires[^\n]*example-click[^\n]*\n/m, '')),
    /example-click.*@fires|example-click.*manifest/i
  );
});

test('checks every dispatch of the same event instead of accepting the first valid producer', () => {
  rejects(
    fixture(
      source.replace(
        'this.dispatchEvent(event);',
        `
      this.dispatchEvent(event);
      this.dispatchEvent(new CustomEvent<ChangeDetail>(Example.eventChange, {
        detail: { value: false }, bubbles: true, composed: true,
      }));
    `
      )
    ),
    /type|detail|payload|assignable/i
  );
});

test('accepts a detail validated with satisfies and rejects a changed field', () => {
  const input = source
    .replace('new CustomEvent<ChangeDetail>', 'new CustomEvent')
    .replace("{ value: 'first' }", "{ value: 'first' } satisfies ChangeDetail");
  assert.doesNotThrow(() => validate(fixture(input)));
  rejects(
    fixture(input.replace("value: 'first'", 'value: 42')),
    /type|detail|payload|assignable/i
  );
});

test('rejects an untyped producer even if its metadata declares a type', () => {
  rejects(
    fixture(source.replace('new CustomEvent<ChangeDetail>', 'new CustomEvent')),
    /type|satisfies|generic/i
  );
});

test('checks exported caller-targeted protocols without inventing an element owner', () => {
  const input = fixture('', {
    'src/components/shared/portal.ts': `
      export interface PortalDetail { value: string; }
      /**
       * @eventProtocol
       * @fires {CustomEvent<PortalDetail>} fixture-portal - Offers a host to the caller.
       */
      export function renderPortal(target: EventTarget) {
        target.dispatchEvent(new CustomEvent<PortalDetail>('fixture-portal', {
          detail: { value: 'portal' }, bubbles: true, composed: true,
        }));
      }
    `,
  });
  const result = validate(input);
  assert.equal(result.producers.length, 1);
  assert.equal(result.producers[0].name, 'fixture-portal');
  assert.equal(result.producers[0].element, undefined);
  assert.equal(result.pairs.length, 0);
});

test('rejects unclassified caller-targeted helpers and private protocol suppressions', () => {
  const helper = `
    interface PortalDetail { value: string; }
    /**
     * @fires {CustomEvent<PortalDetail>} fixture-portal - Offers a host to the caller.
     */
    export function renderPortal(target: EventTarget) {
      target.dispatchEvent(new CustomEvent<PortalDetail>('fixture-portal', {
        detail: { value: 'portal' }, bubbles: true, composed: true,
      }));
    }
  `;
  rejects(
    () => fixture('', { 'src/components/shared/portal.ts': helper }),
    /Unresolved public event owner/
  );
  rejects(
    () =>
      fixture('', {
        'src/components/shared/portal.ts': helper
          .replace('* @fires', '* @eventProtocol\n     * @fires')
          .replace('export function', 'function'),
      }),
    /protocol.*exported producer/i
  );
});

test('keeps ancestor callbacks and Carbon child event re-exposure in the contract', () => {
  const input = fixture(
    source.replace(
      '* @element fixture-aichat-example',
      '* @element fixture-aichat-example\n   * @fires {CustomEvent<ChangeDetail>} cds-search-input - Re-exposes the search field value.'
    ),
    {
      'src/react/example.ts': `
      import React from 'react';
      import { createComponent, type EventName } from '@lit/react';
      import { Example, type ChangeDetail } from '../components/aichat-example/index.js';
      export default createComponent({
        tagName: Example.is, elementClass: Example, react: React,
        events: { onSearchInput: 'cds-search-input' as EventName<CustomEvent<ChangeDetail>> },
      });
    `,
    }
  );
  assert.ok(
    validate(input).pairs.some((pair) => pair.name === 'cds-search-input')
  );
});

test('rejects a new wrapper binding that lacks element metadata', () => {
  rejects(
    fixture(source, {
      'src/react/example.ts': `
      import React from 'react';
      import { createComponent } from '@lit/react';
      import { Example } from '../components/aichat-example/index.js';
      export default createComponent({
        tagName: Example.is, elementClass: Example, react: React,
        events: { onUndocumented: 'undocumented-event' },
      });
    `,
    }),
    /undocumented-event.*@fires|undocumented-event.*manifest/i
  );
});

test('does not justify an unrelated element event with another element public dispatch', () => {
  rejects(
    fixture(source, {
      'src/components/aichat-unrelated/aichat-unrelated.ts': `
      import type { ChangeDetail } from '../aichat-example/aichat-example.js';
      /**
       * @element fixture-aichat-unrelated
       * @fires {CustomEvent<ChangeDetail>} example-change - Has no producer or descendant here.
       */
      export default class Unrelated extends HTMLElement {
        static get is() { return 'fixture-aichat-unrelated'; }
      }
    `,
    }),
    /Unjustified.*fixture-aichat-unrelated.*example-change/
  );
});

test('accepts documented bubbling and composed events from a rendered local descendant', () => {
  const input = fixture(source, {
    'src/components/aichat-parent/aichat-parent.ts': `
      import { html } from 'lit';
      import type { ChangeDetail } from '../aichat-example/aichat-example.js';
      /**
       * @element fixture-aichat-parent
       * @fires {CustomEvent<ChangeDetail>} example-change - Re-exposes its child value.
       */
      export default class Parent extends HTMLElement {
        static get is() { return 'fixture-aichat-parent'; }
        render() { return html\`<fixture-aichat-example></fixture-aichat-example>\`; }
      }
    `,
  });
  assert.ok(
    validate(input).pairs.some((pair) => pair.element.className === 'Parent')
  );
  rejects(
    {
      ...input,
      model: readSource({
        files: Object.fromEntries(
          input.model.sources.map((entry) => [
            path.relative(input.model.root, entry.fileName),
            entry.text.replace('composed: true', 'composed: false'),
          ])
        ),
      }),
    },
    /Unjustified.*fixture-aichat-parent.*example-change/
  );
});

test('keeps same-name event payloads scoped to their own element and re-exposure graph', () => {
  const input = fixture(source, {
    'src/components/aichat-parent/aichat-parent.ts': `
      import { html } from 'lit';
      import type { ChangeDetail } from '../aichat-example/aichat-example.js';
      /**
       * @element fixture-aichat-parent
       * @fires {CustomEvent<ChangeDetail>} example-change - Re-exposes its child string value.
       */
      export default class Parent extends HTMLElement {
        static get is() { return 'fixture-aichat-parent'; }
        render() { return html\`<fixture-aichat-example></fixture-aichat-example>\`; }
      }
    `,
    'src/components/aichat-other/aichat-other.ts': `
      export interface OtherDetail { value: number; }
      /**
       * @element fixture-aichat-other
       * @fires {CustomEvent<OtherDetail>} example-change - Contains this element numeric value.
       */
      export default class Other extends HTMLElement {
        static get is() { return 'fixture-aichat-other'; }
        emit() {
          this.dispatchEvent(new CustomEvent<OtherDetail>('example-change', {
            detail: { value: 42 }, bubbles: true, composed: true,
          }));
        }
      }
    `,
  });
  assert.doesNotThrow(() => validate(input));
});

function parentFixture(body, members = '') {
  return fixture(source, {
    'src/components/aichat-parent/aichat-parent.ts': `
      import { html as markup } from 'lit';
      import type { ChangeDetail } from '../aichat-example/aichat-example.js';
      /**
       * @fires {CustomEvent<ChangeDetail>} example-change - Re-exposes its rendered child value.
       */
      export default class Parent extends HTMLElement {
        static get is() { return 'fixture-aichat-parent'; }
        ${members}
        render() { ${body} }
      }
    `,
  });
}

test('checks bracket-spelled dispatch payloads even when metadata and a wrapper already expose the event', () => {
  const extra = {
    'src/react/example.ts': `
      import React from 'react';
      import { createComponent, type EventName } from '@lit/react';
      import { Example, type ChangeDetail } from '../components/aichat-example/index.js';
      export default createComponent({
        tagName: Example.is, elementClass: Example, react: React,
        events: { onChange: 'example-change' as EventName<CustomEvent<ChangeDetail>> },
      });
    `,
  };
  const bracket = source.replace(
    'this.dispatchEvent(event)',
    "this['dispatchEvent'](event)"
  );
  assert.doesNotThrow(() => validate(fixture(bracket, extra)));
  rejects(
    () =>
      fixture(
        bracket
          .replace(
            'export interface ChangeDetail { value: string; }',
            'export interface ChangeDetail { value: string; }\ninterface OtherDetail { value: number; }'
          )
          .replace(
            'new CustomEvent<ChangeDetail>',
            'new CustomEvent<OtherDetail>'
          )
          .replace("value: 'first'", 'value: 42'),
        extra
      ),
    /producer detail type differs|payload does not match/i
  );
});

test('rejects unassociated CustomEvent constructors and unsupported alias delivery', () => {
  for (const delivery of [
    'const emit = this.dispatchEvent.bind(this); emit(event);',
    'const emit = this.dispatchEvent; emit.call(this, event);',
    'void event;',
  ]) {
    rejects(
      () => fixture(source.replace('this.dispatchEvent(event);', delivery)),
      /Unresolved public event delivery/i
    );
  }
});

test('keeps ordinary constructor values passed to helpers outside the event contract', () => {
  const input = fixture(
    source.replace(
      'this.dispatchEvent(event);',
      `
    this.dispatchEvent(event);
    consume(new Date());
  `
    ) + '\nfunction consume(value: Date) { void value; }'
  );
  assert.deepEqual(
    validate(input).producers.map((entry) => entry.name),
    ['example-change']
  );
});

test('does not infer descendant ownership from strings, dead templates or unused callback bodies', () => {
  for (const [body, members] of [
    [
      'return String.raw`<fixture-aichat-example></fixture-aichat-example>`;',
      '',
    ],
    [
      'return markup`<div></div>`;',
      'unused = markup`<fixture-aichat-example></fixture-aichat-example>`;',
    ],
    [
      'const unused = () => markup`<fixture-aichat-example></fixture-aichat-example>`; return markup`<div></div>`;',
      '',
    ],
    [
      'return markup`<div>${() => markup`<fixture-aichat-example></fixture-aichat-example>`}</div>`;',
      '',
    ],
    [
      'return markup`<div title=${markup`<fixture-aichat-example></fixture-aichat-example>`}></div>`;',
      '',
    ],
    ['return markup`<div title="<fixture-aichat-example>"></div>`;', ''],
    [
      'return markup`<!-- <fixture-aichat-example></fixture-aichat-example> --><div></div>`;',
      '',
    ],
    [
      'return (markup`<fixture-aichat-example></fixture-aichat-example>` ? markup`<div></div>` : null);',
      '',
    ],
  ]) {
    rejects(
      () => parentFixture(body, members),
      /Unjustified.*fixture-aichat-parent.*example-change/
    );
  }
});

test('follows actual Lit render helper returns, local template aliases and array callback results', () => {
  const input = parentFixture(
    'return markup`<div>${[1].map(() => this.childTemplate())}</div>`;',
    'childTemplate() { const result = markup`<fixture-aichat-example></fixture-aichat-example>`; return result; }'
  );
  assert.ok(
    validate(input).pairs.some((pair) => pair.element.className === 'Parent')
  );
});

test('validates the real source and rejects missing Markdown mount metadata and a wrong later payload', () => {
  const model = readSource();
  const manifest = analyze(model);
  assert.doesNotThrow(() => validate({ model, manifest }));
  const files = Object.fromEntries(
    [
      ...model.sources,
      ...model.program
        .getSourceFiles()
        .filter(
          (entry) =>
            entry.fileName.startsWith(path.join(model.root, 'src/')) &&
            entry.fileName.endsWith('.d.ts')
        ),
    ].map((entry) => [path.relative(model.root, entry.fileName), entry.text])
  );
  const markdownPath = 'src/components/aichat-markdown/aichat-markdown.ts';
  const markdown = files[markdownPath];
  assert.match(markdown, /@fires[^\n]+cds-aichat-markdown-plugin-host-mount/);
  for (const [text, message] of [
    [
      markdown.replace(
        /^\s*\*\s*@fires[^\n]+cds-aichat-markdown-plugin-host-mount[^\n]*\n/m,
        ''
      ),
      /markdown-plugin-host-mount.*@fires|markdown-plugin-host-mount.*manifest/i,
    ],
    [
      markdown.replace("kind: 'customRenderer',", "kind: 'invalidRenderer',"),
      /type|detail|payload|assignable/i,
    ],
  ]) {
    assert.notEqual(text, markdown);
    const broken = readSource({
      root: model.root,
      files: { ...files, [markdownPath]: text },
    });
    rejects({ model: broken, manifest: analyze(broken) }, message);
  }
});

test('requires hosting protocol metadata on the canonical inline projection dispatch helpers', () => {
  const model = readSource();
  const producers = readEvents(model);
  const files = Object.fromEntries(
    model.sources.map((entry) => [
      path.relative(model.root, entry.fileName),
      entry.text,
    ])
  );
  for (const name of ['dispatchInlineRunMount', 'dispatchInlineRunUnmount']) {
    const producer = producers.find(
      (entry) => entry.protocol?.name?.text === name
    );
    assert.ok(producer, `Missing exported inline hosting producer ${name}.`);
    const helper = producer.protocol;
    const sourceFile = helper.getSourceFile();
    const file = path.relative(model.root, sourceFile.fileName);
    for (const tagName of ['eventProtocol', 'fires']) {
      const tag = model.ts
        .getJSDocTags(helper)
        .find((entry) => entry.tagName.text === tagName);
      assert.ok(tag);
      const broken = readSource({
        files: {
          ...files,
          [file]:
            sourceFile.text.slice(0, tag.getStart()) +
            sourceFile.text.slice(tag.end),
        },
      });
      assert.throws(
        () => readEvents(broken),
        /Unresolved public event owner|event protocol needs typed @fires metadata/
      );
    }
  }
});
