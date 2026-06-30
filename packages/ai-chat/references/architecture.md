# architecture.md — `@carbon/ai-chat` React/Lit boundary

Load this when working across the React/Lit boundary (custom-element host, shadow DOM, slot projection). Routine React or store work doesn't need it.

## The boundary

```
React API (ChatContainer, ChatCustomElement)
    ↓
Lit Custom Element Host (@carbonElement decorator)
    ↓
Shadow Root (encapsulation boundary)
    ↓
React Portal Mount Point (.cds-aichat--react-app div)
    ↓
React Application Components
```

## How it works

1. **Lit host**: [`ChatContainerReact`](../src/react/ChatContainer.tsx#L40) is a Lit custom element decorated with `@carbonElement("cds-aichat-react")`.
2. **React wrapper**: [`createComponent()`](../src/react/ChatContainer.tsx#L60) from `@lit/react` wraps the Lit host for React consumers.
3. **Shadow DOM setup**: the Lit host creates a shadow root and emits `"shadow-ready"` in [`firstUpdated()`](../src/react/ChatContainer.tsx#L52).
4. **React portal**: [`ChatContainer`](../src/react/ChatContainer.tsx#L183) waits for shadow root, creates a mount div, and portals the React app into it.
5. **Extensibility**: user-defined content crosses the boundary via slots, never direct shadow DOM manipulation.

## When to work in each layer

| Layer | Files                                                                                                                                | Concerns                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Lit   | [src/react/ChatContainer.tsx](../src/react/ChatContainer.tsx), [src/react/ChatCustomElement.tsx](../src/react/ChatCustomElement.tsx) | Custom element registration & lifecycle, shadow DOM setup, slot projection, global style injection |
| React | everything else under [src/](../src)                                                                                                 | Application logic, state, UI components, store integration, service orchestration                  |

## Common patterns

**Passing data into shadow DOM** — the Lit host receives props; the React portal reads from the host:

```typescript
<cds-aichat-react .config=${config} />

const config = wrapperElement.config;
```

**Passing content out via slots** — React creates a slotted element; the Lit host projects it:

```typescript
const element = document.createElement('div');
element.setAttribute('slot', 'user-defined-response');
wrapper.appendChild(element);

<slot name="user-defined-response"></slot>
```

## Debugging across the boundary

| Symptom               | Likely cause                                                                                                         | Fix                                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Shadow root not ready | `"shadow-ready"` listener attached after the event fired, or event never emitted                                     | Verify the listener is attached before the host's `firstUpdated()`; check the browser console for shadow DOM errors                             |
| React not rendering   | Mount div missing, or portal created before shadow root was ready                                                    | Verify `.cds-aichat--react-app` exists in the shadow root; check React DevTools; confirm the portal is gated on `"shadow-ready"`                |
| Slots not projecting  | Slot name mismatch, element appended to shadow root instead of the host wrapper, or element added after Lit's render | Match the `slot` attribute to the `<slot name="…">`; append to the wrapper, not the shadow root; create the element before the Lit host renders |

## References

- Lit host: [src/react/ChatContainer.tsx#L40](../src/react/ChatContainer.tsx#L40)
- React wrapper: [src/react/ChatCustomElement.tsx#L137](../src/react/ChatCustomElement.tsx#L137)
- `@carbonElement` decorator and base classes: [`@carbon/ai-chat-components`](../../ai-chat-components/AGENTS.md)

## Related guidance

- [packages/ai-chat/AGENTS.md](../AGENTS.md) — package overview
- [packages/ai-chat-components/AGENTS.md](../../ai-chat-components/AGENTS.md) — Lit component authoring
