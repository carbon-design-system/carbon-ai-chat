/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * `useChatAutocomplete` imports `AutocompleteController` directly. The class
 * needs no Lit and no custom element, so the module holding it must pull in
 * neither — otherwise every React consumer of this hook ships a Lit runtime
 * and an element registration on the way to a plain class.
 *
 * Nothing else notices when that stops being true: a stray `lit` import in the
 * controller module, or in anything it reaches, leaves every other spec green.
 * So load the module and watch what it does to the environment. Lit publishes
 * its version globals the moment it is evaluated, and a registration has to go
 * through `customElements.define` — both observable however the import was
 * written, including a dynamic `import()` or a `?lit` stylesheet the static
 * form of the check used to miss.
 */

const LIT_GLOBALS = [
  'reactiveElementVersions',
  'litHtmlVersions',
  'litElementVersions',
] as const;

const litGlobalsPresent = (): string[] =>
  LIT_GLOBALS.filter(
    (name) => (globalThis as Record<string, unknown>)[name] !== undefined
  );

/** Load `specifier`, returning every tag it defines along the way. */
async function tagsDefinedBy(specifier: string): Promise<string[]> {
  const defined: string[] = [];
  const original = customElements.define.bind(customElements);
  customElements.define = ((name: string, ...rest: unknown[]) => {
    defined.push(name);
    return (original as (...args: unknown[]) => void)(name, ...rest);
  }) as typeof customElements.define;
  try {
    await import(specifier);
  } finally {
    customElements.define = original;
  }
  return defined;
}

import fs from 'node:fs';
import path from 'node:path';

describe('useChatAutocomplete', () => {
  it('imports the controller, not the controller element', () => {
    // The hook cannot avoid Lit — it renders <cds-aichat-autocomplete> through
    // the React wrapper. What the split buys it is one fewer element: reaching
    // the class no longer registers <cds-aichat-autocomplete-controller>, the
    // second surface on the instance this hook already owns.
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useChatAutocomplete.tsx'),
      'utf8'
    );
    expect(source).toContain(
      'components/prompt-line/src/autocomplete-controller.js'
    );
    expect(source).not.toContain('autocomplete-controller-element');
  });
});

describe('AutocompleteController module graph', () => {
  // Order is load-bearing: the control below pulls Lit into this file's
  // environment on purpose, so it has to run after this case.
  it('reaches no Lit and registers no custom element', async () => {
    const defined = await tagsDefinedBy(
      '../../components/prompt-line/src/autocomplete-controller.js'
    );
    const module =
      await import('../../components/prompt-line/src/autocomplete-controller.js');

    // Without this the assertions below would also hold for a module that
    // failed to load at all.
    expect(typeof module.AutocompleteController).toBe('function');
    expect(litGlobalsPresent()).toEqual([]);
    expect(defined).toEqual([]);
  });

  it('detects Lit and registrations when they are there', async () => {
    // The control. A check that cannot see Lit where Lit is proves nothing
    // about the case above.
    const defined = await tagsDefinedBy(
      '@carbon/web-components/es/components/icon-button/index.js'
    );
    expect(defined).not.toEqual([]);
    expect(litGlobalsPresent()).toEqual([...LIT_GLOBALS]);
  });
});
