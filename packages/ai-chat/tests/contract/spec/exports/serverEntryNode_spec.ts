/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 *
 *  @jest-environment node
 */

/**
 * `serverEntry` is the SSR-safe entry, so a server with no DOM at all can
 * import it. This file runs in Jest's node environment: no `window`,
 * `document`, or `customElements`. That importing it in a browser registers
 * no element is in `serverEntryImport_spec.ts`.
 *
 * It imports no contract helper and calls no `contractSetup()`: the helpers
 * mount chats, which needs a DOM.
 */

describe('importing serverEntry with no DOM', () => {
  it('loads, exports its values, and defines no DOM globals', async () => {
    expect(typeof (globalThis as any).window).toBe('undefined');
    const entry = await import('../../../../src/serverEntry');
    expect(entry.BusEventType.RECEIVE).toBe('receive');
    expect(entry.ViewType.MAIN_WINDOW).toBe('mainWindow');
    expect(typeof (globalThis as any).window).toBe('undefined');
    expect(typeof (globalThis as any).document).toBe('undefined');
    expect(typeof (globalThis as any).customElements).toBe('undefined');
  });
});
