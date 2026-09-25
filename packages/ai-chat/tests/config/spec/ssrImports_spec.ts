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
    results[entry] = { message: String(error?.message), frame };
  }
}
console.log(JSON.stringify({ results }));
`;

function importInNode(entries: string[]) {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', SCRIPT, ...entries],
    { cwd: PACKAGE_ROOT, env, encoding: 'utf8', timeout: 60000 }
  );
  expect(result.status).toBe(0);
  const lines = result.stdout.trim().split('\n');
  return JSON.parse(lines[lines.length - 1]);
}

describe('server-side imports of the built package', () => {
  it.each([
    '@carbon/ai-chat',
    '@carbon/ai-chat/es-custom',
    '@carbon/ai-chat/server',
  ])(
    'imports %s without browser globals',
    (entry) => {
      expect(importInNode([entry])).toEqual({ results: { [entry]: 'ok' } });
    },
    70000
  );
});
