/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readSource } from '../manifest-source.js';
import { readWrappers } from '../manifest-wrappers.js';

const element = `
  export default class Example extends HTMLElement {
    static get is() { return 'fixture-aichat-example'; }
    static get eventChange() { return 'example-change'; }
  }
`;

function model(wrapper, extra = {}) {
  return readSource({
    prefix: 'fixture',
    files: {
      'src/components/aichat-example/aichat-example.ts': element,
      'src/components/aichat-example/index.ts': `
        export { default as Example } from './aichat-example.js';
      `,
      'src/react/example.tsx': wrapper,
      ...extra,
    },
  });
}

const imports = `
  import React from 'react';
  import { createComponent, type EventName } from '@lit/react';
  import { Example } from '../components/aichat-example/index.js';
`;

const options = `{
  tagName: Example.is,
  elementClass: Example,
  react: React,
  events: {
    onChange: Example.eventChange as EventName<CustomEvent<{ value: string }>>,
  },
}`;

test('reads native wrappers and named export aliases through a family barrel', () => {
  const records = readWrappers(
    model(`${imports}
      const Wrapper = createComponent(${options});
      export { Wrapper as NamedExample };
      export default Wrapper;
    `)
  );
  assert.deepEqual(records.map((entry) => entry.exportName).sort(), [
    'NamedExample',
    'default',
  ]);
  assert.equal(records[0].module, 'src/react/example.tsx');
  assert.equal(records[0].element.className, 'Example');
  assert.equal(records[0].element.tagName, 'fixture-aichat-example');
  assert.equal(records[0].callbacks[0].callback, 'onChange');
  assert.equal(records[0].callbacks[0].eventName, 'example-change');
  assert.equal(records[0].callbacks[0].type, 'CustomEvent<{ value: string }>');
  assert.match(records[0].callbacks[0].location, /example\.tsx:\d+/);
});

test('reads a bridge without importing its implementation', () => {
  const records = readWrappers(
    model(`${imports}
      import { withWebComponentBridge as bridge } from './utils/withWebComponentBridge.js';
      const Wrapper = bridge(createComponent(${options}));
      export default Wrapper;
    `)
  );
  assert.equal(records.length, 1);
  assert.equal(records[0].callbacks[0].eventName, 'example-change');
});

test('follows outer JSX adapters and nested history reexports to their final exports', () => {
  const source = model(
    `${imports}
      const Base = createComponent(${options});
      const Wrapper = React.forwardRef((props, ref) => <Base {...props} ref={ref} />);
      export default Wrapper;
    `,
    {
      'src/react/history/index.ts': `
        export { default as HistoryExample } from '../example.js';
      `,
    }
  );
  const records = readWrappers(source);
  assert.deepEqual(
    records.map((entry) => [entry.module, entry.exportName]).sort(),
    [
      ['src/react/example.tsx', 'default'],
      ['src/react/history/index.ts', 'HistoryExample'],
    ]
  );
  assert.ok(records.every((entry) => entry.element.className === 'Example'));
});

test('follows the Markdown createElement, forwardRef, bridge and fragment adapter chain', () => {
  const records = readWrappers(
    model(`${imports}
      import { forwardRef as forward } from 'react';
      import { withWebComponentBridge } from './utils/withWebComponentBridge.js';
      const Lit = createComponent(${options});
      const Forwarded = React.forwardRef((props, ref) =>
        React.createElement(Lit, { ...props, ref })
      );
      const Base = withWebComponentBridge(Forwarded);
      const Wrapper = forward((props, ref) => <><Base {...props} ref={ref} /><div /></>);
      export default Wrapper;
    `)
  );
  assert.equal(records.length, 1);
  assert.equal(records[0].exportName, 'default');
  assert.equal(records[0].callbacks[0].callback, 'onChange');
});

test('keeps grouped wrappers tied to their own elements', () => {
  const records = readWrappers(
    model(
      `${imports}
        import Other from '../components/aichat-other/aichat-other.js';
        const First = createComponent(${options});
        const Second = createComponent({tagName: Other.is, elementClass: Other, react: React});
        export { First, Second };
      `,
      {
        'src/components/aichat-other/aichat-other.ts': `
          export default class Other extends HTMLElement {
            static get is() { return 'fixture-aichat-other'; }
          }
        `,
        'src/components/aichat-other/index.ts': `
          export { default as Other } from './aichat-other.js';
        `,
      }
    )
  );
  assert.deepEqual(
    records.map((entry) => [entry.exportName, entry.element.tagName]).sort(),
    [
      ['First', 'fixture-aichat-example'],
      ['Second', 'fixture-aichat-other'],
    ]
  );
});

test('requires the same element class static is instead of an independent tag string', () => {
  assert.throws(
    () =>
      readWrappers(
        model(`${imports}
          export default createComponent(${options.replace('Example.is', "'fixture-aichat-example'")});
        `)
      ),
    /example\.tsx:\d+.*static is/
  );
});

test('rejects an unresolved element instead of omitting the wrapper', () => {
  assert.throws(
    () =>
      readWrappers(
        model(`${imports}
          class Missing extends HTMLElement {}
          export default createComponent({tagName: Missing.is, elementClass: Missing, react: React});
        `)
      ),
    /example\.tsx:\d+.*published element/
  );
});

test('rejects unsupported adapter calls instead of silently dropping their base wrapper', () => {
  assert.throws(
    () =>
      readWrappers(
        model(`${imports}
          const Base = createComponent(${options});
          export default unknownAdapter(Base);
        `)
      ),
    /example\.tsx:\d+.*supported exported wrapper adapter/
  );
});

test('rejects an unknown exported adapter even when its native base has a separate export', () => {
  assert.throws(
    () =>
      readWrappers(
        model(`${imports}
          export const Base = createComponent(${options});
          export default unknownAdapter(Base);
        `)
      ),
    /example\.tsx:\d+.*supported exported wrapper adapter/
  );
});

test('rejects a foreign adapter with the local bridge name', () => {
  assert.throws(
    () =>
      readWrappers(
        model(`${imports}
    import { withWebComponentBridge } from 'foreign-bridge';
    export default withWebComponentBridge(createComponent(${options}));
  `)
      ),
    /supported exported wrapper adapter/
  );
});

test('rejects shorthand, spread, computed and repeated options instead of hiding callback bindings', () => {
  for (const value of [
    'events',
    '...eventOptions',
    "['events']: {}",
    'get events() { return {}; }',
    'events: {}, events: {}',
  ]) {
    assert.throws(
      () =>
        readWrappers(
          model(`${imports}
      const events = { onChange: 'example-change' };
      const eventOptions = { events };
      export default createComponent({ tagName: Example.is, elementClass: Example, react: React, ${value} });
    `)
        ),
      /example\.tsx:\d+.*(?:explicit|once)/
    );
  }
});

test('resolves factory and event type identities through local reexport barrels and value aliases', () => {
  const records = readWrappers(
    model(
      `
    import React from 'react';
    import { create, type TypedEvent } from './factory.js';
    import { Example } from '../components/aichat-example/index.js';
    const factory = create;
    export default factory({
      tagName: Example.is, elementClass: Example, react: React,
      events: { onChange: 'example-change' as TypedEvent<CustomEvent<{ value: string }>> },
    });
  `,
      {
        'src/react/factory.ts':
          "export { createComponent as create, type EventName as TypedEvent } from '@lit/react';",
      }
    ),
    { requireEventTypes: true }
  );
  assert.equal(records.length, 1);
  assert.equal(records[0].callbacks[0].type, 'CustomEvent<{ value: string }>');
});

test('rejects an adapter that renders different element wrappers', () => {
  assert.throws(
    () =>
      readWrappers(
        model(`${imports}
          const First = createComponent(${options});
          const Second = createComponent(${options});
          export default React.forwardRef(() => <><First /><Second /></>);
        `)
      ),
    /example\.tsx:\d+.*one element/
  );
});

test('rejects an adapter whose only wrapper JSX is unused or inside an unreturned callback', () => {
  for (const expression of [
    'const unused = <Base/>; return <div/>;',
    'const unused = () => <Base/>; return <div/>;',
    'return <div render={() => <Base/>} />;',
    'return <div data-example={<Base/>} />;',
    'const value = <Base/>; return <div data-example={value} />;',
    "return React.createElement('div', { example: <Base/> });",
    'return (<Base/> ? <div/> : null);',
    'return (<Base/> && <div/>);',
    'return `${<Base/>}`;',
  ]) {
    assert.throws(
      () =>
        readWrappers(
          model(`${imports}
      const Base = createComponent(${options});
      export default React.forwardRef(() => { ${expression} });
    `)
        ),
      /(?:supported exported wrapper adapter|rendered custom-element wrapper)/
    );
  }
});

test('follows a public export to a native wrapper implemented in a utility module', () => {
  const records = readWrappers(
    model("export { default } from './utils/example-base.js';", {
      'src/react/utils/example-base.ts': `
      import React from 'react';
      import { createComponent } from '@lit/react';
      import { Example } from '../../components/aichat-example/index.js';
      export default createComponent({tagName: Example.is, elementClass: Example, react: React});
    `,
    })
  );
  assert.equal(records.length, 1);
  assert.equal(records[0].module, 'src/react/example.tsx');
  assert.equal(records[0].element.className, 'Example');
});

test('follows a returned JSX value alias even when its native base is separately exported', () => {
  const records = readWrappers(
    model(`${imports}
    export const Base = createComponent(${options});
    export default React.forwardRef(() => {
      const result = <Base/>;
      return result;
    });
  `)
  );
  assert.deepEqual(records.map((entry) => entry.exportName).sort(), [
    'Base',
    'default',
  ]);
});

test('reads bindings before type enforcement and rejects a removed or widened event cast when enabled', () => {
  for (const expression of [
    "'example-change'",
    "'example-change' as EventName<CustomEvent<any>>",
    "'example-change' as EventName<CustomEvent>",
  ]) {
    const source = model(`${imports}
      export default createComponent({
        tagName: Example.is, elementClass: Example, react: React,
        events: { onChange: ${expression} },
      });
    `);
    assert.equal(
      readWrappers(source)[0].callbacks[0].eventName,
      'example-change'
    );
    assert.throws(
      () => readWrappers(source, { requireEventTypes: true }),
      /example\.tsx:\d+.*EventName.*concrete DOM event type/
    );
  }
  assert.doesNotThrow(() =>
    readWrappers(
      model(`${imports} export default createComponent(${options});`),
      {
        requireEventTypes: true,
      }
    )
  );
});

test('supports aliased Lit factories, EventName imports and namespace React calls', () => {
  const records = readWrappers(
    model(`
      import * as React from 'react';
      import { createComponent as create, type EventName as TypedEvent } from '@lit/react';
      import { Example as Element } from '../components/aichat-example/index.js';
      const Wrapper = create({
        tagName: Element.is, elementClass: Element, react: React,
        events: { onKeyDown: 'keydown' as TypedEvent<KeyboardEvent> },
      });
      export default React.memo(Wrapper);
    `)
  );
  assert.equal(records[0].callbacks[0].type, 'KeyboardEvent');
});

test('keeps third-party element wrappers outside the locally owned manifest contract', () => {
  const records = readWrappers(
    model(`
      import React from 'react';
      import { createComponent } from '@lit/react';
      import { ThirdPartyElement } from '@example/components';
      export default createComponent({
        tagName: 'third-party-element', elementClass: ThirdPartyElement, react: React,
      });
    `)
  );
  assert.deepEqual(records, []);
});

test('resolves the production wrappers through their final exported adapters', (context) => {
  const records = readWrappers(readSource());
  const elements = new Set(records.map((entry) => entry.element.tagName));
  const bindings = new Set(
    records.flatMap((entry) =>
      entry.callbacks.map(
        (callback) =>
          `${entry.element.tagName}:${callback.callback}:${callback.eventName}`
      )
    )
  );
  context.diagnostic(
    `${records.length} wrapper exports, ${elements.size} elements, ${bindings.size} callback bindings`
  );
  for (const module of [
    'src/react/code-snippet.tsx',
    'src/react/toolbar.tsx',
    'src/react/chat-header.tsx',
    'src/react/markdown.tsx',
    'src/react/history/history-panel-item.ts',
    'src/react/history/index.ts',
    'src/react/transcript.ts',
  ]) {
    assert.ok(
      records.some((entry) => entry.module === module),
      module
    );
  }
  assert.equal(
    records.find((entry) => entry.module === 'src/react/code-snippet.tsx')
      .callbacks[0].eventName,
    'content-change'
  );
  assert.equal(
    records.find(
      (entry) =>
        entry.module === 'src/react/card.ts' &&
        entry.exportName === 'CardFooter'
    ).element.tagName,
    'cds-aichat-card-footer'
  );
});
