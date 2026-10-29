# architecture.md — `@carbon/ai-chat` React/Lit boundary

Load this when working across the React/Lit boundary (custom-element host, shadow DOM, slot projection). Routine React or store work doesn't need it.

## The boundary

Every surface mounts through one Lit element, `cds-aichat-container`. Only the renderer that puts the React app into it differs.

```
ChatCustomElement (React)          cds-aichat-custom-element (Lit)
  <div> you size                     sizes itself
        ↓                                  ↓
ChatContainer (React) ──────────→ cds-aichat-container (Lit)
                                     light DOM: extension content
                                         ↓ shadow root
                                   .cds-aichat--react-app  ← ChatAppEntry renders here
                                     beside the app's own <slot> elements
```

## How it works

1. **Tag names**: write tags as lowercase literals. **Never write an uppercase tag literal** for a `tagName` comparison: the es-custom build rewrites lowercase `cds-aichat` text only, so derive the uppercase form with `.toUpperCase()` at runtime.
2. **Container**: [cds-aichat-container.ts](../src/web-components/cds-aichat-container/cds-aichat-container.ts) holds the decorated class. It lives beside the public entry because the React entry needs the class registered without reaching the standalone renderer, which imports `react-dom/client` — a module React 17 does not ship. It adds the instance's writeable elements and bus handlers, then calls the host's `onBeforeRender`. The public [index.ts](../src/web-components/cds-aichat-container/index.ts) only installs the standalone renderer and re-exports.
3. **Startup**: the container owns it. It starts services, connects extension collectors, runs `onBeforeRender`, opens the render gate, and applies the initial view. Only then does it schedule `onAfterRender`. It owns config updates and the resize and visibility listeners too. It owns the live regions in the same shadow root. React separately acknowledges the initial view commit before after-render can run. **Put new startup work here, not in React.**
4. **Renderer seam**: [react-renderer.ts](../src/web-components/shared/react-renderer.ts) defines `mount(target)` → `render(App, inputs)` / `unmount()`. The container loads `App` (`ChatAppEntry`) with the services, so a failed chunk load is logged by startup on every surface instead of reaching the host's React tree. The container uses the renderer it was given, else the installed default. With neither, it waits for the default. A mount keeps its renderer.
5. **Two renderers**: the public [index.ts](../src/web-components/cds-aichat-container/index.ts) installs one `createRoot` renderer for plain web-component hosts. **Import `react-dom/client` in [react-dom-renderer.ts](../src/web-components/shared/react-dom-renderer.ts) only**, and import that module from web-component entries only — React 17 does not ship it, and the React entry imports the element class directly without triggering the renderer. React [ChatContainer](../src/react/ChatContainer.tsx) portals `ChatAppEntry` from the host's own root, keyed by mount. It sets the host element's properties itself rather than through `@lit/react`, whose server build sets none. Host context, events, and error boundaries then reach the chat.
6. **Extension content**: portal hosts and slotted content land in `cds-aichat-container`'s light DOM, where page CSS reaches them, and the app's own `<slot>` elements project them from that same shadow root. **Append extension nodes to the container, never into a shadow root.** A slot whose host is gone shows its fallback again. The plain host service [extensionHosts.ts](../src/chat/services/extensionHosts.ts) owns these hosts for responses, both footer kinds, input nodes, and editor light-DOM content, along with their records and listeners. It connects [lightDomHosts.ts](../src/chat/services/lightDomHosts.ts), which owns the editor's light-DOM hosts and their observer. It keeps one host per slot and attaches it only while the chat is connected, the kind has a callback, and the view reported content. `cds-aichat-custom-element` adds a forwarding slot, because it wraps the container in its own shadow root. The container renders no Lit template; its live-region node sits beside the React target.
7. **Slot callbacks**: the host service and its portal adapters serve both surfaces. The container creates and connects `ExtensionHosts` before before-render. `ChatAppEntry` receives that owner. The React wrapper supplies its request-footer flag before startup; web-component callbacks are checked live. The container adapts each web-component callback into a React render prop; its `HTMLElement` result goes into the slot host as is (`SlotHostPortal`). The adapters only render content and report it from layout effects. **Fix slot behavior in the host service, not in the adapters or Lit.**

## Mount cleanup

- **Invalidate the mount first.** A retired mount's `onBeforeRender` and `onAfterRender` calls are dropped: every `await` in startup rechecks that its mount is still the current one.
- **Release outer-host state on detach and on a new mount's before-render.** Both outer elements remove their bus handlers from the old instance and clear slot state. The container also removes nodes it created. Caller-owned children stay.
- **Do not treat this as teardown.** Services keep running after detach; full disposal belongs to #1681.

## When to work in each layer

Private native views in `src/chat/components/` render in light DOM inside the existing container shadow root. `NativeChatView` selects store and view-state values. It releases subscriptions on detach and sends render errors to the existing callback. Native owners now cover the home screen, header, launcher, input, and panels. React still wraps retained content. Consumer content stays in its existing tree.

`NativePanels` composes panel frames and their direct slots in light DOM, as the shell's direct `slot="panels"` child. The existing `PanelManager` owns rank, reactivation, and opener focus. Built-in loading, hydration, disclaimer, iframe, error, and confirmation bodies are native. Messages, response bodies and footers, citations, configured markdown, inline errors, and consumer content stay in the existing React tree through stable portal targets.

The existing `ExtensionHosts` owner keeps panel targets separate from its page-light-DOM extension hosts. Native views place panel targets inside the container's shadow root before React mounts their content. Later frame transitions wait for the matching retained content's layout commit; each frame preserves its initial open value and synchronous transition callbacks. The native views add no shadow root. Plain owners manage loading delays, iframe source lifetimes, and the disclaimer's read flag. Same-task moves preserve DOM and retained state; actual detach releases pending work.

Native targets can arrive after the first React commit. Retained content adapters hold the first commit signal in `ChatViewState` until content effects finish or an empty fallback commits. `ChatAppEntry` then reports the commit to the container. Keep this passive effect separate from panel layout commits and the container's listener-ready gate. React does not start services.

The native input owner keeps values, the editor handle, lazy extensions, drafts, pending Stop state, uploads, and controls in private `ChatInput`. It renders in the existing shadow root as the shell's direct `slot="input"` child. `AppShell` retains React normalization and messages. `ShellLifecycle` supplies input callbacks. The private Stop command owns Stop effects. Each chat has one `ExtensionHosts.autocompleteContent` owner. `AutocompleteContentAdapter` keeps custom lists in the consumer React tree through stable targets. Content adapters use the existing root and provider. Startup, the listener-ready gate, and React's commit acknowledgment stay separate.

| Owner | Remaining responsibility |
| --- | --- |
| Container and renderer seam | Registration, shadow DOM, slots, startup, listener gate, renderer choice, cleanup, live regions |
| `ChatShell` / `ShellLifecycle` | Native state, DOM callbacks, focus, sizing, subscriptions, resource cleanup |
| `NativePanels` and native panel bodies | Native frames, slots, hydration, loading, disclaimer, iframe, error, confirmation |
| `AppShell` / `AppShellPanels` and `ChatAppEntry` | React content, messages, response bodies and footers, citations, markdown, inline errors, portals, commit signal |
| `ChatContainer` and public React wrappers | Public props, host context, events, consumer React root |

This package still requires React. React 17, 18, and 19 remain supported. The standalone renderer keeps its client import out of the React entry. A future React-optional milestone must replace the message renderer and configured Markdown, citation, error, and consumer content paths. It also needs a host contract for content that does not use React. This milestone keeps SDK exports, host names, and service shutdown unchanged.

## Debugging across the boundary

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Web component never renders | No renderer: the page loaded the React entry but not the web-component entry | Import `@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js`; waiting hosts wake when it loads |
| Slot content not projecting | Host appended to the wrong element, or the app renders no slot by that name | Append to `chatWrapper` (the container) and check the host's `assignedSlot` |
| Fallback text hidden | A host node is still assigned to the slot | Remove the host node; the slot falls back to its own children |

## Related guidance

- [packages/ai-chat/AGENTS.md](../AGENTS.md) — package overview
- [services.md](services.md) — service lifecycle and the teardown gap
- [packages/ai-chat-components/AGENTS.md](../../ai-chat-components/AGENTS.md) — Lit component authoring
