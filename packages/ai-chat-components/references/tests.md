# tests.md — `@carbon/ai-chat-components` testing

Load this when adding, moving, or fixing a test in this package. Write the case itself by [writing-tests.md](../../../references/writing-tests.md); test accessibility by [accessibility.md](../../../references/accessibility.md#testing-accessibility). This guide holds only what's specific here.

## Where a test goes

A test lives with the code that owns the behavior ([ai-chat's rule](../../ai-chat/references/tests.md#where-a-test-goes)). This package owns rendering, tokens, HTML, keyboard handling and focus inside an element, an element's own announcements, and how its elements compose. Chat state, config, messaging, which target gets focus after a chat action, and what the chat announces belong to ai-chat.

- **Beside the module.** Put the test in the `__tests__/` next to the code, named for it. A sub-component's tests go in its own `__tests__/`. Every Lit element gets tests there. Every new or changed React wrapper gets a spec in `src/react/__tests__/`.
- **A Lit element's behavior is a browser test,** named `<name>.browser.test.ts`. happy-dom is for plain modules, React wrappers, and the Storybook tests. If a test renders only to reach logic, move the logic to a plain module and test it in happy-dom.
- **Focus needs the browser project.** That covers `activeElement`, `:focus-within`, tab order, and `tabbable` results. A React test may check that a prop sets `tabIndex` or `inert`, but that doesn't prove what's tabbable.
- **A browser-only API gets a browser test with no stub:** `ElementInternals`, `adoptedStyleSheets`, layout, and selection. If a stub stands in for the behavior under test, move the test to the browser project without the stub.
- **Test a behavior once, on the element.** A React wrapper test checks only the mapping: props to properties or attributes, `on*` callbacks to events, and children to slots.
- **Helpers.** A helper every browser test may use goes in `src/__tests__/browser/`. Any other helper stays in its component's `__tests__/`.

## Which project runs a file

| File | Project | Runs in |
| --- | --- | --- |
| `*.browser.test.*`, under `src/` or `.storybook/__tests__/` | `browser` | Chromium, at 800x600 as web-test-runner sized it. `CAIC_ALL_BROWSERS=1` adds Firefox and WebKit, as the nightly jobs do. Firefox runs one file at a time; in CI every browser does |
| any other `*.test.*` there | `happy-dom` | happy-dom, with no setup file |
| `tasks/__tests__/*.test.js` | `node --test` | Node, through `npm run test:manifest`, not Vitest |

## Imports

A Lit element test imports the element from source, by relative path, as in `import '../index.js';`. A React wrapper test imports the built `es/` and `es-custom/` on purpose, because it tests what a React host loads: `@carbon/ai-chat-components/es/react/chat-button.js`. Another package's `es/`, such as `@carbon/icons/es/…`, is fine anywhere.

Carbon's tests import `es/` because web-test-runner has no compile step. This package's Vitest compiles `*.scss?lit` and Lit's decorators as the build does, so its Lit tests read source on purpose.

## Test through the public surface

The surface is what `custom-elements.json` lists (properties, attributes, events, slots, CSS parts), plus the accessibility tree. Set inputs through attributes, properties, slotted children, and real input. Assert events, reflected attributes, slot assignment, parts, and role, name, and state. You may query the shadow root to reach a control.

- **Check rendered structure with explicit assertions on that surface.** This package keeps no DOM snapshots, unlike Carbon, on purpose: Chromatic checks how each story looks, on both Storybooks.
- **Check state through ARIA, not class names:** `aria-activedescendant` or `aria-selected` for the active option, `disabled` or `aria-disabled` for a disabled control. Check a class only when the class is the behavior, such as a documented style hook.
- **Assert role, name, and state on what a user reaches,** read as [Assertion style](#assertion-style) shows.
- **Say why when a test reaches past the surface.** A `_private` call or a read of internal markup gets a comment: what the check protects, and why the surface can't show it cheaply.

```ts
// No public event reports which item takes focus after a delete.
const next = list._nextFocusTarget(deleted);
```

This package has no contract tier: no `.contract` suffix and no manifest row. Test host-facing behavior through the surface above; if a refactor breaks such a test, stop for review. Public API changes follow the [manifest and wrapper workflow](component-authoring.md#manifest-and-react-wrappers), where `test:manifest` and the root `test:manifest-consumer` check packaging and the manifest.

## Events

Start `oneEvent` before the action, then act in the same flow, then await it. Assert the event's name and `detail`, plus `bubbles` and `composed` when a host listens above the element.

```ts
const toggled = oneEvent(el, 'cds-aichat-transcript-toggle'); // listen first
button.click();
const { detail, bubbles, composed } = await toggled;
```

## Keyboard and focus

- **Use real input:** `sendKeys` and `sendMouse` from `src/__tests__/browser/input.ts`. A synthetic `KeyboardEvent` is only for a handler path real keys can't reach, with a comment that says so. Carbon mixes the two; this package uses real keys on purpose, because a dispatched event skips the browser's default actions, focus, and composition.
- **Cover the keys the [APG pattern](https://www.w3.org/WAI/ARIA/apg/patterns/) lists for the widget,** plus focus on entry, Escape and return, and focus after a removal. Name the pattern in the `describe` or a comment.
- **Read focus through shadow roots,** with `shadowRoot.activeElement` or `:focus-within`. `document.activeElement` stops at the host.

```ts
// APG menu button pattern
first.focus();
await sendKeys({ press: 'ArrowDown' });
const focused = menu.shadowRoot!.activeElement;
```

## Waits and fixtures

The rules are in [writing-tests.md](../../../references/writing-tests.md#waits-wait-on-a-signal). This package's signals and fixtures:

- **After a change, await `updateComplete`.** When children render too, also await each child's `updateComplete`; Lit's doesn't wait for them.
- **Wait for an event with `oneEvent`, and for a condition with `waitUntil`,** both from `@open-wc/testing`.
- **`fixture` removes what it mounts after each case.** It registers that cleanup only while Vitest globals are on, so keep `globals: true`.
- **Render real Carbon and child elements.** In the browser project, spy on a module with `vi.mock(path, { spy: true })`.

```ts
shell.open = true;
await shell.updateComplete;
await panel.updateComplete; // a child that renders too
```

## Integration between elements

An element that coordinates others through slots, events that cross element boundaries, focus that moves between elements, or a shared manager needs integration tests. Add one when you add a child to a family, a slot, a cross-element event, or a coordinator's reaction to a child's state.

- **Test or story.** An outcome a host can observe in code gets a test: slot assignment, an event at the coordinator's host, a focus target, a reflected attribute, or `inert`. How the composition looks (spacing, corners, responsive layout) gets a story, which Chromatic checks. Stories don't assert: the package has no play functions.
- **Where.** In the `__tests__/` of the element that reacts. A shared manager's test goes in the manager's folder. It's always a browser test, named `<coordinator>-<behavior>-integration.browser.test.ts`, as in `chat-shell/__tests__/panel-focus-integration.browser.test.ts`.
- **Keep it small:** one coordinator, its direct children, and one crossing per case. Mount the smallest ancestor. Assert on public surfaces, never inside a child's shadow root. Use no ai-chat import, store, config, or network. A multi-step user journey belongs to an ai-chat cross-module test or the demo.
- **Cover the web-component cases:** a child added or removed after first render (`slotchange`), a child upgraded after its parent, an optional child that's absent, and `bubbles` and `composed` where a host listens.
- **Use real children,** in the markup a host writes, as the stories do. A stub child needs a reason comment. A fixture two or more files share goes in that family's `__tests__/helpers/`.
- **The boundary with ai-chat.** Composition inside this package is tested here. How chat config drives the shell is an ai-chat cross-module test.

```ts
const shell = await fixture(html`
  <cds-aichat-shell>
    <button slot="messages">Open panel</button>
    <div slot="panels"><cds-aichat-panel></cds-aichat-panel></div>
  </cds-aichat-shell>
`);
```

## Assertion style

A Lit element test uses open-wc's `fixture`, `html`, and `oneEvent`, with its chai `expect`. Read role, name, and state from attributes. Keep one assertion library per file, so chai's `expect` and Vitest's never mix.

```ts
import { expect, fixture, html } from '@open-wc/testing';

const el = await fixture<CDSAIChatPanel>(
  html`<cds-aichat-panel open panel-aria-label="Confirm"></cds-aichat-panel>`
);
const dialog = el.shadowRoot!.querySelector('[role="dialog"]')!;
expect(dialog.getAttribute('aria-label')).to.equal('Confirm');
```

## Helpers

| Need | Use | From |
| --- | --- | --- |
| Mount a Lit template and clean it up | `fixture`, `html` | `@open-wc/testing` |
| Wait for an event or condition | `oneEvent`, `waitUntil` | `@open-wc/testing` |
| Real keys and mouse | `sendKeys`, `sendMouse`, `resetMouse` | `src/__tests__/browser/input.ts` |
| Media emulation (reduced motion, color scheme, forced colors) | `emulateMedia` | `src/__tests__/browser/input.ts` |
| Wait for the prompt line's rich editor | `waitForRich` | `prompt-line/src/__tests__/wait-for-rich.ts` |
| A markdown selection fixture | `inline-selection-fixture.ts` | `markdown/__tests__/` |

The input helpers keep the `@web/test-runner-commands` signatures.

## Checks with no module

- `tasks/__tests__/`: `node --test` checks for the CEM plugins and the prompt-line events, run by `npm run test:manifest`.
- `.storybook/__tests__/`: the Storybook version switcher, in happy-dom.
- The root `npm run test:manifest-consumer`: packs the built package and checks its manifest ([what it checks](component-authoring.md#what-the-tools-do)).

## Running tests

The `browser` project needs Playwright's Chromium, installed once per machine with `npx playwright install chromium` (add `firefox webkit` for `CAIC_ALL_BROWSERS=1`).

From this package directory:

```bash
npm test                                   # test:manifest, then both projects
npm test -- --project browser              # browser project only
npm test -- --project happy-dom            # happy-dom project only
npm test -- -t "name pattern"              # by name

# One file
npm test -- src/components/card/__tests__/card.browser.test.ts
```

## Debugging failures

| Symptom | Cause | Fix |
| --- | --- | --- |
| A Lit element in a React test never wires its events | A dependency loaded its Node build | Add the package to `test.server.deps.inline` in `vitest.config.ts`, so it resolves with the `browser` condition |
| A test passes in happy-dom but can't show the behavior | It needs real layout, focus, selection or input | Name it `*.browser.test.ts` so the `browser` project runs it |
| A React wrapper test fails against code that is correct in `src/` | It imports the built `es/` or `es-custom/`, and that output is stale | Rebuild first; see the [build preflight](../../../references/commands.md#build-preflight) |
| `vi.spyOn` on an imported module throws in a browser test | Browser mode serves sealed ES modules | `vi.mock('<path>', { spy: true })`, then `vi.mocked(fn)` |
| A selection case fails only in Firefox | Firefox resets the selection anchor across slots | Check for a known Firefox skip, as in `inline-markdown-selection.browser.test.ts` |
| Hover or pointer state leaks into the next case | The mouse stays where the last case left it | Call `resetMouse()` in `afterEach` |

## Related guidance

- [../AGENTS.md](../AGENTS.md): package authoring rules
- [storybook.md](storybook.md): stories, which run no tests here
