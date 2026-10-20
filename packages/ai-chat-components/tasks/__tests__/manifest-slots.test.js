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
  internalMembersPlugin,
} from '../cem-plugins.js';
import { readSource } from '../manifest-source.js';
import { validateSlots } from '../manifest-slots.js';
import { validateProperties } from '../manifest-properties.js';

const source = `
  import { LitElement, html } from 'lit';
  /**
   * @element fixture-aichat-example
   * @slot header - Header content.
   */
  export default class Example extends LitElement {
    static get is() { return 'fixture-aichat-example'; }
    render() { return html\`<slot name="header"></slot><slot></slot>\`; }
  }
`;

function analyze(model) {
  const prefix = model.elements[0].tagName.split('-aichat-')[0];
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
      carbonElementTagPlugin({ prefix }),
      internalMembersPlugin(),
      componentModulePathsPlugin(),
    ],
  });
}

function fixture(text = source, extra = {}) {
  const model = readSource({
    prefix: 'fixture',
    files: {
      'src/components/aichat-example/aichat-example.ts': text,
      'src/components/aichat-example/index.ts':
        "export { default as Example } from './aichat-example.js';",
      ...extra,
    },
  });
  const manifest = analyze(model);
  const declaration = manifest.modules
    .flatMap((module) => module.declarations ?? [])
    .find((entry) => entry.tagName === 'fixture-aichat-example');
  return { model, manifest, declaration };
}

function validate(input) {
  return validateSlots(input.model, input.manifest);
}

function rejects(input, pattern) {
  assert.throws(
    () => validate(input),
    (error) => {
      assert.match(error.message, /src\/[^\n]+\.ts:\d+:\d+/);
      assert.match(error.message, pattern);
      return true;
    }
  );
}

test('compares consumer named slots to source and CEM in both directions while ignoring the default slot', () => {
  const input = fixture();
  assert.deepEqual(
    validate(input).map((slot) => slot.name),
    ['header']
  );
  rejects(
    fixture(source.replace('* @slot header - Header content.', '')),
    /slot header needs one @slot declaration/
  );
  rejects(
    fixture(source.replace('<slot name="header"></slot>', '')),
    /Unrendered named slot fixture-aichat-example.header/
  );
  input.declaration.slots = [];
  rejects(input, /slot header needs one manifest entry/);
  for (const absent of ['undefined', 'null']) {
    assert.doesNotThrow(() =>
      validate(
        fixture(
          source
            .replace('* @slot header - Header content.', '')
            .replace('name="header"', `name=\${${absent}}`)
        )
      )
    );
  }
});

test('checks named slots rendered by callable class fields', () => {
  const text = source.replace(
    'render() { return html`<slot name="header"></slot><slot></slot>`; }',
    'render = () => html`<slot name="header"></slot><slot></slot>`;'
  );
  const input = fixture(text);
  assert.deepEqual(
    validate(input).map((slot) => slot.name),
    ['header']
  );
  rejects(
    fixture(text.replace('* @slot header - Header content.', '')),
    /slot header needs one @slot declaration/
  );
  input.declaration.slots = [];
  rejects(input, /slot header needs one manifest entry/);
});

test('rejects repeated source tags, repeated manifest entries and phantom CEM slots', () => {
  rejects(
    fixture(
      source.replace(
        '* @slot header - Header content.',
        '* @slot header - Header content.\n * @slot header - Repeated.'
      )
    ),
    /slot header needs one @slot declaration/
  );
  const duplicate = fixture();
  duplicate.declaration.slots.push({ ...duplicate.declaration.slots[0] });
  rejects(duplicate, /slot header needs one manifest entry/);
  const phantom = fixture();
  phantom.declaration.slots.push({ name: 'phantom' });
  rejects(phantom, /Unrendered named slot fixture-aichat-example.phantom/);
});

test('resolves finite helper arguments, aliases, conditionals and names assembled in attributes', () => {
  const text = source
    .replace(
      '* @slot header - Header content.',
      '* @slot header - Header content.\n * @slot footer - Footer content.'
    )
    .replace(
      'render() { return html`<slot name="header"></slot><slot></slot>`; }',
      `
    private slot(name: string) { return html\`<slot name=\${name}></slot>\`; }
    render() { return html\`\${this.slot('header')}\${this.slot('footer')}\`; }
  `
    );
  assert.deepEqual(
    new Set(validate(fixture(text)).map((slot) => slot.name)),
    new Set(['header', 'footer'])
  );
  assert.doesNotThrow(() =>
    validate(
      fixture(
        source
          .replace('render() {', "render() { const tail = 'der';")
          .replace('name="header"', 'name="hea${tail}"')
      )
    )
  );
});

test('rejects an unknown public name expression instead of omitting its slot', () => {
  rejects(
    fixture(
      source
        .replace('render() {', 'render() { const dynamic = window.name;')
        .replace('name="header"', 'name=${dynamic}')
    ),
    /Unresolved named slot.*Unresolved contract expression/
  );
});

test('ignores strings, unused templates, nested callback bodies and templates assigned only as element properties', () => {
  const text = source
    .replace(
      'render() { return',
      `
    unused = html\`<slot name="dead-field"></slot>\`;
    render() {
      const unused = () => html\`<slot name="dead-callback"></slot>\`;
      const text = String.raw\`<slot name="string"></slot>\`;
      return
  `.replace('return\n', 'return ')
    )
    .replace(
      '<slot name="header"></slot><slot></slot>',
      '<div .example=${html`<slot name="attribute"></slot>`}></div><slot name="header"></slot>'
    );
  assert.deepEqual(
    validate(fixture(text)).map((slot) => slot.name),
    ['header']
  );
});

test('fails an unsupported returned renderer that could invoke a slot callback', () => {
  rejects(
    fixture(
      source.replace(
        'return html`<slot name="header"></slot><slot></slot>`',
        'return unknownRenderer(() => html`<slot name="header"></slot>`)'
      )
    ),
    /supported source renderer/
  );
});

test('follows assigned template state and destructured helper return values', () => {
  const text =
    `function renderContent() { const template = html\`<slot name="header"></slot>\`; return { template }; }\n` +
    source.replace(
      'render() { return html`<slot name="header"></slot><slot></slot>`; }',
      `
    private output = html\`\`;
    updated() { const { template } = renderContent(); this.output = template; }
    render() { const { output } = this; return html\`\${output}\`; }
  `
    );
  assert.deepEqual(
    validate(fixture(text)).map((slot) => slot.name),
    ['header']
  );
});

test('inventories bracket-selected templates and source callback aliases', () => {
  const empty = source.replace('* @slot header - Header content.', '');
  const render =
    'render() { return html`<slot name="header"></slot><slot></slot>`; }';
  for (const expression of [
    'const output = { body: html`<slot name="new-public"></slot>` }; return output[\'body\'];',
    'const makeSlot = () => html`<slot name="new-public"></slot>`; return [0].map(makeSlot);',
    'const makeSlot = () => html`<slot name="new-public"></slot>`; const alias = makeSlot; return [0].map(alias);',
    'let makeSlot; makeSlot = () => html`<slot name="new-public"></slot>`; return [0].map(makeSlot);',
  ]) {
    rejects(
      fixture(empty.replace(render, `render() { ${expression} }`)),
      /slot new-public needs one @slot declaration/
    );
  }
});

test('does not prove phantom slots from raw text or inert template content', () => {
  for (const tag of ['textarea', 'title', 'script', 'style', 'template']) {
    rejects(
      fixture(
        source.replace(
          '<slot name="header"></slot><slot></slot>',
          `<${tag}><slot name="header"></slot></${tag}>`
        )
      ),
      /Unrendered named slot fixture-aichat-example.header/
    );
    rejects(
      fixture(
        source.replace(
          '<slot name="header"></slot><slot></slot>',
          `<${tag}>\${html\`<slot name="header"></slot>\`}</${tag}>`
        )
      ),
      /Unrendered named slot fixture-aichat-example.header/
    );
  }
});

test('matches exact HTML slot and inert tag names without hiding custom elements', () => {
  for (const tag of ['title-bar', 'style-preview', 'template-preview']) {
    assert.doesNotThrow(() =>
      validate(
        fixture(
          source.replace(
            '<slot name="header"></slot><slot></slot>',
            `<${tag}><slot name="header"></slot></${tag}>`
          )
        )
      )
    );
  }
  rejects(
    fixture(
      source.replace(
        '<slot name="header"></slot>',
        '<slot-widget name="header"></slot-widget>'
      )
    ),
    /Unrendered named slot fixture-aichat-example.header/
  );
});

test('checks caller-owned exported renderer returns and aliases without assigning an element owner', () => {
  const empty = source
    .replace('* @slot header - Header content.', '')
    .replace('<slot name="header"></slot>', '');
  for (const declaration of [
    'export function renderContent() { return html`<slot name="new-public"></slot>`; }',
    'export default () => html`<slot name="new-public"></slot>`;',
    'const content = () => html`<slot name="new-public"></slot>`; const alias = content; export { alias as renderContent };',
    'export const content = html`<slot name="new-public"></slot>`;',
    'export const content = [html`<slot name="new-public"></slot>`][0];',
    'export let renderContent; renderContent = () => html`<slot name="new-public"></slot>`;',
    'export let content; content = html`<slot name="new-public"></slot>`;',
    'export let content = html``; content = html`<slot name="new-public"></slot>`;',
    'export const content = (html`<slot name="new-public"></slot>` as never);',
    'const content: string = html`<slot name="new-public"></slot>` as unknown as string; export function renderContent(): string { return content; }',
    'function cycleA() { if (window.name) return cycleB(); return html`<slot name="new-public"></slot>`; } export function unusedRoot() { const unused = cycleA(); return html``; } export function cycleB() { return cycleA(); }',
  ]) {
    rejects(
      fixture(empty, {
        'src/components/aichat-example/renderer.ts': `import { html } from 'lit'; ${declaration}`,
      }),
      /canonical owner of named slot new-public/
    );
  }
  rejects(
    fixture(empty, {
      'src/components/aichat-example/renderer.ts':
        'import {html} from "lit"; export function renderContent(): any { if (window.name) return "text"; return html`<slot name=${window.name}></slot>`; }',
    }),
    /Unresolved named slot/
  );
  assert.doesNotThrow(() =>
    validate(
      fixture(empty, {
        'src/components/aichat-example/renderer.ts':
          'import {html} from "lit"; export function renderContent() { const unused = html`<slot name="unused"></slot>`; return html``; }',
        'src/components/aichat-example/strings.ts': `
          const names: Record<string, string> = {};
          function normalized(name: string) { return name.toLowerCase(); }
          export function lookup(name: string): string { return names[normalized(name)] ?? name; }
        `,
      })
    )
  );
});

test('reads inserted imperative slot names and aliases without treating input names or unused slot objects as API', () => {
  for (const statement of [
    "alias.name = 'header';",
    "alias.setAttribute('name', 'header');",
    "alias['name'] = 'header';",
    "alias['set' + 'Attribute']('name', 'header');",
  ]) {
    const text = source.replace(
      'render() { return html`<slot name="header"></slot><slot></slot>`; }',
      `
      connectedCallback() {
        const slot = document.createElement('slot'); const alias = slot;
        ${statement} this.renderRoot.appendChild(alias);
        const unused = document.createElement('slot'); unused.name = 'unused';
        const input = document.createElement('input'); input.name = 'input-name'; this.appendChild(input);
      }
      render() { return html\`\`; }
    `
    );
    const bracketed = text
      .replace(
        "document.createElement('slot')",
        "document['create' + 'Element']('slot')"
      )
      .replace(
        'this.renderRoot.appendChild(alias)',
        "this.renderRoot['appendChild'](alias)"
      );
    assert.deepEqual(
      validate(fixture(bracketed)).map((slot) => slot.name),
      ['header']
    );
    assert.deepEqual(
      validate(
        fixture(text.replace('const alias = slot;', 'let alias; alias = slot;'))
      ).map((slot) => slot.name),
      ['header']
    );
    const assigned = text.replace(
      "const slot = document.createElement('slot');",
      "let slot: HTMLSlotElement; slot = document.createElement('slot');"
    );
    assert.deepEqual(
      validate(fixture(assigned)).map((slot) => slot.name),
      ['header']
    );
    assert.deepEqual(
      validate(
        fixture(
          text.replace(
            'this.renderRoot.appendChild(alias)',
            "new Map().set('forwarder', alias); this.renderRoot.appendChild(alias)"
          )
        )
      ).map((slot) => slot.name),
      ['header']
    );
    rejects(
      fixture(
        assigned
          .replace('* @slot header - Header content.', '')
          .replace(statement, statement.replace('header', 'new-public'))
      ),
      /slot new-public needs one @slot declaration/
    );
  }
});

test('fails unresolved imperative tags and owners but accepts a symbol-resolved helper owner', () => {
  const create = `const slot = document.createElement('slot'); slot.name = 'header'; target.appendChild(slot);`;
  const helper = `import { Example } from './index.js'; export function forward(target: HTMLElement) { ${create} }`;
  const text = source.replace('<slot name="header"></slot>', '');
  rejects(
    fixture(text, { 'src/components/aichat-example/forward.ts': helper }),
    /canonical owner of named slot header/
  );
  assert.doesNotThrow(() =>
    validate(
      fixture(text, {
        'src/components/aichat-example/forward.ts': helper.replace(
          'export function',
          '\n/** @slotOwner {Example} */\nexport function'
        ),
      })
    )
  );
  rejects(
    fixture(
      text.replace(
        'render() {',
        `connectedCallback() { const slot = document.createElement(window.name); slot.name = 'header'; this.appendChild(slot); } render() {`
      )
    ),
    /Resolve the created tag before naming a possible slot/
  );
  rejects(
    fixture(
      text.replace(
        'render() {',
        "connectedCallback() { const slot = document.createElement('slot'); slot.name = 'header'; const foreign = { appendChild(node: HTMLSlotElement) {} }; foreign.appendChild(slot); } render() {"
      )
    ),
    /Resolve the named slot insertion through a DOM parent/
  );
  rejects(
    fixture(
      text.replace(
        'render() {',
        "private createSlot() { const slot = document.createElement('slot'); slot.name = 'header'; return slot; } connectedCallback() { this.appendChild(this.createSlot()); } render() {"
      )
    ),
    /Resolve the named slot insertion through a DOM parent/
  );
});

test('inventories class-field slot creation and rejects unsupported inline slot forwarding', () => {
  const empty = source
    .replace('* @slot header - Header content.', '')
    .replace('<slot name="header"></slot>', '');
  const field = empty.replace(
    'render() {',
    "private forwarded = document.createElement('slot'); connectedCallback() { this.forwarded.name = 'new-public'; this.appendChild(this.forwarded); } render() {"
  );
  rejects(fixture(field), /slot new-public needs one @slot declaration/);
  for (const statement of [
    "this.appendChild(Object.assign(document.createElement('slot'), { name: 'new-public' }));",
    "const slot = document.createElement('slot'); configure(slot); this.appendChild(slot);",
  ]) {
    rejects(
      fixture(
        empty.replace(
          'render() {',
          `connectedCallback() { ${statement} } render() {`
        )
      ),
      /Resolve the named slot insertion through a DOM parent/
    );
  }
});

const generated = `
  const SLOT_PREFIX = 'fixture-projection';
  let sequence = 0;
  /** @slotNameProtocol {SLOT_PREFIX} */
  function nextSlot() { return \`\${SLOT_PREFIX}-\${++sequence}\`; }
`;

test('recognizes generated names through their source producer and does not exempt new public slots in that producer module', () => {
  const text =
    generated +
    source
      .replace('* @slot header - Header content.', '')
      .replace('name="header"', 'name=${nextSlot()}');
  const slots = validate(fixture(text));
  assert.equal(slots.length, 1);
  assert.equal(slots[0].protocols.length, 1);
  rejects(
    fixture(text.replace('<slot></slot>', '<slot name="new-public"></slot>')),
    /slot new-public needs one @slot declaration/
  );
  rejects(
    fixture(text.replace('<slot></slot>', '<slot name=${window.name}></slot>')),
    /Unresolved named slot/
  );
});

test('checks every generated producer return and rejects broad or malformed protocol annotations', () => {
  const text =
    generated +
    source
      .replace('* @slot header - Header content.', '')
      .replace('name="header"', 'name=${nextSlot()}');
  for (const changed of [
    text
      .replace('fixture-projection', 'different-prefix')
      .replace('${SLOT_PREFIX}-', 'fixture-projection-'),
    text.replace(
      'return `${SLOT_PREFIX}-${++sequence}`',
      "return 'fixed-public'"
    ),
    text.replace('@slotNameProtocol {SLOT_PREFIX}', '@slotNameProtocol'),
    text.replace(
      '@slotNameProtocol {SLOT_PREFIX}',
      '@slotNameProtocol {SLOT_PREFIX}\n * @slotNameProtocol {SLOT_PREFIX}'
    ),
  ]) {
    rejects(
      fixture(changed),
      /generated slot.*(?:protocol|prefix)|generated slot name protocol/
    );
  }
  rejects(
    fixture(text + "\nnextSlot = () => 'fixed-public';"),
    /generated slot name producer cannot be reassigned/
  );
});

test('rejects stale generated producer dependencies and finite caller values disguised as opaque suffixes', () => {
  const text =
    generated +
    source
      .replace('* @slot header - Header content.', '')
      .replace('name="header"', 'name=${nextSlot()}');
  const reassigned = text.replace(
    'function nextSlot() { return `${SLOT_PREFIX}-${++sequence}`; }',
    "function nextSlot() { return makeName(); }\n let makeName = () => `${SLOT_PREFIX}-${++sequence}`;\n makeName = () => 'new-public';"
  );
  rejects(
    fixture(reassigned),
    /generated slot producer dependency cannot be reassigned/
  );
  const finite = text
    .replace(
      'function nextSlot() { return `${SLOT_PREFIX}-${++sequence}`; }',
      'function nextSlot(name: string) { return `${SLOT_PREFIX}-${name}`; }'
    )
    .replace('name=${nextSlot()}', "name=${nextSlot('new-public')}");
  rejects(
    fixture(finite),
    /generated slot protocol must preserve.*opaque suffix/
  );
});

test('traces generated names through typed descriptor construction and rejects an unproven new write', () => {
  const prefix =
    generated +
    `
    interface Descriptor { slotName: string; }
    function consume(value: Descriptor) { return value; }
    const descriptor = consume({ slotName: nextSlot() });
  `;
  const text =
    prefix +
    source
      .replace('* @slot header - Header content.', '')
      .replace('name="header"', 'name=${descriptor.slotName}');
  assert.doesNotThrow(() => validate(fixture(text)));
  rejects(
    fixture(text + "\nconsume({ slotName: 'new-public' });"),
    /Unresolved named slot/
  );
  rejects(
    fixture(text + '\ndescriptor.slotName = window.name;'),
    /Unresolved named slot/
  );
});

function rejectsSourceSlotChange(files, file, before, after, pattern) {
  const changed = files[file].replace(before, after);
  assert.notEqual(changed, files[file]);
  const model = readSource({ files: { ...files, [file]: changed } });
  assert.throws(() => validateSlots(model, analyze(model)), pattern);
}

test('validates the canonical graph and rejects real missing property prose and new public slots in generated producers', (context) => {
  const model = readSource();
  const manifest = analyze(model);
  const properties = validateProperties(model, manifest);
  const slots = validateSlots(model, manifest);
  context.diagnostic(
    `${properties.filter((property) => !property.hidden).length} public properties, ${new Set(slots.filter((slot) => slot.name).map((slot) => `${slot.element.tagName}:${slot.name}`)).size} named slot pairs`
  );
  const files = Object.fromEntries(
    model.sources.map((entry) => [
      path.relative(model.root, entry.fileName),
      entry.text,
    ])
  );
  const toolbar = 'src/components/aichat-toolbar/aichat-toolbar.ts';
  const missing = readSource({
    files: {
      ...files,
      [toolbar]: files[toolbar].replace(
        '/** Primary title shown when the title slot is empty. */',
        ''
      ),
    },
  });
  assert.throws(
    () => validateProperties(missing, analyze(missing)),
    /cds-aichat-toolbar property titleText needs a source description/
  );
  const fallback = 'src/components/aichat-markdown/utils/plugin-fallback.ts';
  rejectsSourceSlotChange(
    files,
    fallback,
    '<slot name=${slotName}>${fallbackText}</slot>',
    '<slot name=${slotName}>${fallbackText}</slot><slot name="new-public"></slot>',
    /cds-aichat-markdown slot new-public needs one @slot declaration/
  );
  const projection =
    'src/components/aichat-markdown/utils/inline-run-projection.ts';
  rejectsSourceSlotChange(
    files,
    projection,
    'name=${options.slotName}',
    'name="new-public"',
    /slot new-public needs one @slot declaration/
  );
  const inline = 'src/components/aichat-markdown/inline-markdown.ts';
  rejectsSourceSlotChange(
    files,
    inline,
    '`${INLINE_MARKDOWN_SLOT_PREFIX}-${namespace}`',
    "'new-public'",
    /generated slot protocol must preserve.*opaque suffix/
  );
  rejectsSourceSlotChange(
    files,
    inline,
    '${output}',
    '${output}<slot name="new-public"></slot>',
    /canonical owner of named slot new-public/
  );
});
