# integration-tests.md — testing how `@carbon/ai-chat-components` elements work together

Load this when you add a child to an element family, a slot, a cross-element event, or a coordinator's reaction to a child's state. Write each case by [writing-tests.md](../../../references/writing-tests.md), and place and run the file by [tests.md](tests.md).

An element that coordinates others through slots, events that cross element boundaries, focus that moves between elements, or a shared manager needs integration tests.

## Test or story

An outcome a host can observe in code gets a test: slot assignment, an event at the coordinator's host, a focus target, a reflected attribute, or `inert`. How the composition looks (spacing, corners, responsive layout) gets a story, which Chromatic checks. Stories don't assert: the package has no play functions.

## Where it goes, and how big it is

- **Where.** In the `__tests__/` of the element that reacts. A shared manager's test goes in the manager's folder. It's always a browser test. Name it for the coordinator, then the behavior, then `-integration.browser.test.ts`.
- **Keep it small:** one coordinator, its direct children, and one crossing per case. Mount the smallest ancestor. Assert on public surfaces. Never query inside a child's shadow root, apart from [reading where focus landed](../../../references/accessibility.md#testing-accessibility). Use no ai-chat import, store, config, or network. A multi-step user journey belongs to an ai-chat cross-module test or the demo.
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
