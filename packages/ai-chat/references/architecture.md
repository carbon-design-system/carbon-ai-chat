# architecture.md — `@carbon/ai-chat` React/Lit boundary

Load this when working across the React/Lit boundary (custom-element host, shadow DOM, slot projection). Routine React or store work doesn't need it.

## The boundary

Every surface mounts through the same two Lit elements. Only the renderer that puts the React app into them differs.

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
3. **Startup**: the container owns it. It starts services, waits for the renderer's listeners, runs `onBeforeRender`, opens the render gate, and applies the initial view. Only then does it schedule `onAfterRender`. It owns config updates and the resize and visibility listeners too. **Put new startup work here, not in React.**
4. **Renderer seam**: [react-renderer.ts](../src/web-components/shared/react-renderer.ts) defines `mount(target)` → `render(inputs)` / `unmount()`. The container uses the renderer it was given, else the installed default. With neither, it waits for the default. A mount keeps its renderer.
5. **Two renderers**: the public [index.ts](../src/web-components/cds-aichat-container/index.ts) installs one `createRoot` renderer for plain web-component hosts. **Keep `react-dom/client` in that file only** — React 17 does not ship it, and the React components import the class module instead. React [ChatContainer](../src/react/ChatContainer.tsx) portals `ChatAppEntry` from the host's own root, keyed by mount. It sets the host element's properties itself rather than through `@lit/react`, whose server build sets none. Host context, events, and error boundaries then reach the chat.
6. **Extension content**: portal hosts and slotted content land in `cds-aichat-container`'s light DOM, where page CSS reaches them, and the app's own `<slot>` elements project them from that same shadow root. **Append extension nodes to the container, never into a shadow root.** A slot whose host is gone shows its fallback again. `cds-aichat-custom-element` is the one surface that still forwards, because it wraps the container in its own shadow root.

## Mount cleanup

- **Invalidate the mount first.** A retired mount's `onBeforeRender` and `onAfterRender` calls are dropped: every `await` in startup rechecks that its mount is still the current one.
- **Release outer-host state on detach and on a new mount's before-render.** Both outer elements remove their bus handlers from the old instance and clear slot state. The container also removes nodes it created. Caller-owned children stay.
- **Do not treat this as teardown.** Services keep running after detach; full disposal belongs to #1681.

## When to work in each layer

| Layer | Files | Concerns |
| --- | --- | --- |
| Lit | [src/web-components/](../src/web-components) | Registration, shadow DOM, slot forwarding, renderer selection, mount cleanup |
| React wrappers | [src/react/](../src/react) | Public props, host portal, per-mount key |
| React app | everything else under [src/chat/](../src/chat) | Application logic, state, UI components, store integration, service orchestration |

## Common patterns

**Passing content out via slots** — create the node in the outer container's light DOM; the container forwards it and the app's `<slot>` projects it:

```typescript
const element = document.createElement('div');
element.setAttribute('slot', 'user-defined-response');
chatWrapper.appendChild(element);
```

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
