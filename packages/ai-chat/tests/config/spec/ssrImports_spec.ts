/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The built entries must not touch browser globals while they load in plain
 * Node. Jest runs in jsdom, so this spawns a separate Node process with no
 * browser globals and no inherited loader flags, then imports each entry
 * through the package's own exports map. It needs a current build.
 *
 * All public entries must load without importing browser-only UI modules.
 * The server preload helper must also work without a DOM.
 */

import { spawnSync } from 'child_process';
import { resolve } from 'path';

const PACKAGE_ROOT = resolve(__dirname, '../../..');

const SCRIPT = `
const present = ['window', 'document', 'HTMLElement', 'customElements', 'CSSStyleSheet']
  .filter((name) => name in globalThis);
if (present.length) {
  console.log(JSON.stringify({ globals: present }));
  process.exit(0);
}
const results = {};
for (const entry of process.argv.slice(1)) {
  try {
    const module = await import(entry);
    if (entry === '@carbon/ai-chat/server') {
      await module.loadAllLazyDeps();
    }
    results[entry] = 'ok';
  } catch (error) {
    const frame = String(error?.stack ?? '').split('\\n')[1] ?? '';
    results[entry] = { code: error?.code, message: String(error?.message), frame };
  }
}
console.log(JSON.stringify({ results }));
`;

function importInNode(entries: string[], script = SCRIPT) {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', script, ...entries],
    { cwd: PACKAGE_ROOT, env, encoding: 'utf8', timeout: 60000 }
  );
  if (result.status !== 0) {
    throw new Error(
      `Node SSR probe failed:\n${result.stderr}\n${result.stdout}`
    );
  }
  expect(result.status).toBe(0);
  expect(result.stderr).not.toMatch(
    /useLayoutEffect|layout effect|ReferenceError/
  );
  const lines = result.stdout.trim().split('\n');
  return JSON.parse(lines[lines.length - 1]);
}

describe('server-side imports of the built package', () => {
  it('renders supported React entries without DOM globals or layout effects', () => {
    const result = importInNode(
      [],
      `
      const names = ['window', 'document', 'HTMLElement', 'customElements', 'CSSStyleSheet'];
      const before = names.filter((name) => name in globalThis);
      const { default: React } = await import('react');
      const { renderToString } = await import('react-dom/server');
      const { ChatContainer, ChatCustomElement } = await import('@carbon/ai-chat');
      const container = renderToString(React.createElement(ChatContainer, {}));
      const customElement = renderToString(React.createElement(ChatCustomElement, {}));
      const after = names.filter((name) => name in globalThis);
      console.log(JSON.stringify({ before, after, container, customElement }));
    `
    );
    expect(result).toEqual({
      before: [],
      after: ['customElements'],
      container: '',
      customElement: '<div></div>',
    });
  }, 70000);

  it('uses native Lit Node conditions for opaque server markup', () => {
    const result = importInNode(
      [],
      `
      const names = ['window', 'document', 'HTMLElement', 'customElements', 'CSSStyleSheet'];
      const before = names.filter((name) => name in globalThis);
      const { createRequire } = await import('node:module');
      const { default: React } = await import('react');
      const { renderToString } = await import('react-dom/server');
      const { createComponent } = await import('@lit/react');
      const { LitElement } = await import('lit');
      class ServerProbe extends LitElement {
        get message() { return ''; }
        set message(value) {}
      }
      const NativeServerProbe = createComponent({
        tagName: 'caic-server-interop', elementClass: ServerProbe, react: React,
      });
      const require = createRequire(import.meta.url);
      const native = renderToString(React.createElement(NativeServerProbe, { message: 'server property' }));
      const after = names.filter((name) => name in globalThis);
      console.log(JSON.stringify({ before, after, native,
        litReact: require.resolve('@lit/react').replaceAll('\\\\', '/'),
      }));
    `
    );
    expect(result).toEqual({
      before: [],
      after: ['customElements'],
      litReact: expect.stringContaining('/@lit/react/node/index.js'),
      native: '<caic-server-interop></caic-server-interop>',
    });
  }, 70000);

  it.each(['@carbon/ai-chat', '@carbon/ai-chat/es', '@carbon/ai-chat/server'])(
    'imports %s without browser globals',
    (entry) => {
      expect(importInNode([entry])).toEqual({ results: { [entry]: 'ok' } });
    },
    70000
  );

  it.each([
    '@carbon/ai-chat/es-custom',
    '@carbon/ai-chat/dist/es-custom/aiChatEntry.js',
    '@carbon/ai-chat/dist/es-custom/web-components/cds-aichat-container/index.js',
    '@carbon/ai-chat/dist/es-custom/web-components/cds-aichat-custom-element/index.js',
    '@carbon/ai-chat-components/es-custom/components/aichat-card/index.js',
  ])(
    'rejects the removed fixed-prefix entry %s',
    (entry) => {
      expect(importInNode([entry])).toMatchObject({
        results: { [entry]: { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' } },
      });
    },
    70000
  );
});
