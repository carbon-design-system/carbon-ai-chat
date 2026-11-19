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
import { readProperties, validateProperties } from '../manifest-properties.js';

const elementPath = 'src/components/aichat-example/aichat-example.ts';
const source = `
  import { LitElement } from 'lit';
  import { property, query, state } from 'lit/decorators.js';
  /** @element fixture-aichat-example */
  export default class Example extends LitElement {
    static get is() { return 'fixture-aichat-example'; }
    /** The visible value. */
    @property({ type: String }) value = '';
    /**
     * Nonreactive application data.
     * @public
     */
    context = { value: 'context' };
    /**
     * The current label.
     * @public
     */
    get label() { return this.value; }
    set label(value: string) { this.value = value; }
    @query('input') private input!: HTMLInputElement;
    @state() private busy = false;
    /** Internal slotted content. */
    @property({ attribute: false }) private slottedContent = '';
    static metadata = '';
    render() { return this.value; }
  }
`;

function analyze(model) {
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
      internalMembersPlugin(),
      componentModulePathsPlugin(),
    ],
  });
}

function fixture(text = source, extra = {}) {
  const model = readSource({
    prefix: 'fixture',
    files: {
      [elementPath]: text,
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
  return validateProperties(input.model, input.manifest);
}

function rejects(input, pattern) {
  assert.throws(
    () => validate(input),
    (error) => {
      assert.match(error.message, /src\/components\/[^\n]+\.ts:\d+:\d+/);
      assert.match(error.message, pattern);
      return true;
    }
  );
}

test('keeps reactive and explicitly public nonreactive fields and accessors in the manifest', () => {
  const input = fixture();
  const properties = validate(input);
  assert.deepEqual(
    properties.filter((entry) => !entry.hidden).map((entry) => entry.name),
    ['value', 'context', 'label']
  );
  assert.equal(
    properties.find((entry) => entry.name === 'label').declarations.length,
    2
  );
  assert.ok(
    input.declaration.members.some(
      (entry) => entry.name === 'slottedContent' && entry.privacy === 'private'
    )
  );
});

test('requires source and manifest descriptions independently', () => {
  rejects(
    fixture(source.replace('/** The visible value. */', '')),
    /fixture-aichat-example property value needs a source description/
  );
  const input = fixture();
  delete input.declaration.members.find((entry) => entry.name === 'value')
    .description;
  rejects(input, /property value needs a manifest description/);
});

test('requires each public reactive field in CEM independently of its source prose', () => {
  const missing = fixture();
  missing.declaration.members = missing.declaration.members.filter(
    (entry) => entry.name !== 'value'
  );
  rejects(missing, /property value needs one public manifest field/);
  const repeated = fixture();
  repeated.declaration.members.push({
    ...repeated.declaration.members.find((entry) => entry.name === 'value'),
  });
  rejects(repeated, /property value needs one public manifest field/);
});

test('requires an explicit public contract for undecorated fields and arrow handlers', () => {
  rejects(
    fixture(source.replace('@public', '')),
    /property context needs an explicit @public contract/
  );
  rejects(
    fixture(
      source.replace(
        'static metadata',
        'handleClick = () => {};\n    static metadata'
      )
    ),
    /property handleClick needs an explicit @public contract/
  );
});

test('inventories constructor parameter properties by visibility rather than dropping them', () => {
  for (const visibility of ['public', 'readonly']) {
    const input = fixture(
      source.replace(
        'static metadata',
        `constructor(${visibility} visible: string = '') { super(); }\n static metadata`
      )
    );
    rejects(input, /property visible needs an explicit @public contract/);
    assert.ok(
      readProperties(input.model).some(
        (property) => property.name === 'visible'
      )
    );
  }
  const hidden = fixture(
    source.replace(
      'static metadata',
      "constructor(private secret: string = '') { super(); }\n static metadata"
    )
  );
  assert.doesNotThrow(() => validate(hidden));
  hidden.declaration.members.push({
    kind: 'field',
    name: 'secret',
    privacy: 'public',
    description: 'Leaked constructor state.',
  });
  rejects(hidden, /property secret is implementation state/);
});

test('rejects query and state fields declared with public source visibility', () => {
  for (const member of ['input', 'busy']) {
    rejects(
      fixture(source.replace(`private ${member}`, member)),
      new RegExp(
        `property ${member}.*(?:implementation state|private or protected)`
      )
    );
  }
});

test('rejects private reactive, query, state and internal fields leaked as public CEM rows', () => {
  for (const name of ['input', 'busy', 'slottedContent']) {
    const input = fixture();
    const field = input.declaration.members.find(
      (entry) => entry.name === name
    );
    if (field) {
      delete field.privacy;
    } else {
      input.declaration.members.push({ kind: 'field', name });
    }
    rejects(input, new RegExp(`property ${name} is implementation state`));
  }
  const input = fixture(
    source
      .replace('private slottedContent', 'slottedContent')
      .replace('/** Internal slotted content. */', '/** @internal */')
  );
  assert.doesNotThrow(() => validate(input));
  input.declaration.members.push({
    kind: 'field',
    name: 'slottedContent',
    description: 'Leaked state.',
  });
  rejects(input, /property slottedContent is implementation state/);
});

test('follows local bases and accessor overrides while preserving the inherited public contract', () => {
  const input = fixture(
    source
      .replace(
        "import { LitElement } from 'lit';",
        "import Base from './base.js';"
      )
      .replace('extends LitElement', 'extends Base')
      .replace(
        "/** The visible value. */\n    @property({ type: String }) value = '';",
        "override value = 'child';"
      ),
    {
      'src/components/aichat-example/base.ts': `
      import { LitElement } from 'lit';
      import { property } from 'lit/decorators.js';
      export default abstract class Base extends LitElement {
        /** The visible value. */
        @property({ type: String }) value = '';
        /**
         * Public base data.
         * @public
         */
        baseData = 1;
      }
    `,
    }
  );
  const properties = validate(input);
  const value = properties.find((entry) => entry.name === 'value');
  assert.equal(value.reactive, true);
  assert.equal(value.declarations.length, 2);
  assert.ok(properties.some((entry) => entry.name === 'baseData'));
});

test('follows local base fields through generic mixin intersection types', () => {
  const input = fixture(`
    import { LitElement, html } from 'lit';
    import { property } from 'lit/decorators.js';
    class Base extends LitElement {
      /** The inherited label. */
      @property({ type: String }) visible = '';
    }
    function Pass<T extends new (...args: any[]) => LitElement>(base: T) { return class extends base {}; }
    export default class Example extends Pass(Base) {
      static get is() { return 'fixture-aichat-example'; }
      render() { return html\`\`; }
    }
  `);
  assert.ok(
    readProperties(input.model).some((property) => property.name === 'visible')
  );
  assert.doesNotThrow(() => validate(input));
  input.declaration.members = input.declaration.members.filter(
    (member) => member.name !== 'visible'
  );
  rejects(input, /property visible needs one public manifest field/);
});

test('resolves imported decorator aliases and finite computed property keys', () => {
  assert.doesNotThrow(() =>
    validate(
      fixture(
        source
          .replace(
            'property, query, state',
            'property as reactive, query, state'
          )
          .replaceAll('@property', '@reactive')
      )
    )
  );
  const computed = fixture(
    source
      .replace(
        'export default class',
        "const key = 'value';\n  export default class"
      )
      .replace("value = '';", "[key] = '';")
  );
  assert.ok(
    readProperties(computed.model).some((entry) => entry.name === 'value')
  );
  rejects(computed, /property value needs one public manifest field/);
  assert.throws(
    () =>
      readProperties(
        fixture(
          source
            .replace(
              'export default class',
              'declare const key: string;\n  export default class'
            )
            .replace("value = '';", "[key] = '';")
        ).model
      ),
    /Unresolved contract expression: key/
  );
});

test('rejects phantom public fields and does not treat a method as a source property', () => {
  for (const name of ['missing', 'render']) {
    const input = fixture();
    input.declaration.members.push({
      kind: 'field',
      name,
      description: 'Invented public field.',
    });
    rejects(
      input,
      new RegExp(
        `Unresolved public manifest property fixture-aichat-example.${name}`
      )
    );
  }
});

test('keeps real Carbon inherited field descriptions outside local enforcement', () => {
  const input = fixture(
    `
    import CarbonButton from '@carbon/web-components/es/components/button/button.js';
    /** @element fixture-aichat-example */
    export default class Example extends CarbonButton {
      static get is() { return 'fixture-aichat-example'; }
      /** The visible value. */
      value = '';
    }
  `.replace(
      '/** The visible value. */',
      '/** The visible value.\n * @public\n */'
    )
  );
  input.declaration.members.push({ kind: 'field', name: 'disabled' });
  assert.doesNotThrow(() => validate(input));
});
