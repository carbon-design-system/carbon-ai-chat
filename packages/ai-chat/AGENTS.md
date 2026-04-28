# AGENTS.md — `@carbon/ai-chat`

Guidance for authoring inside [packages/ai-chat/](.). Read this before editing anything here.

## What this package is

The primary Carbon AI Chat app. Ships as:

- A React component tree rooted at [src/aiChatEntry.tsx](src/aiChatEntry.tsx).
- Lit web-component wrappers (`cds-aichat-container`, `cds-aichat-custom-element`) under [src/web-components/](src/web-components) that mount the same React tree via `@lit/react`.
- A server entry ([src/serverEntry.ts](src/serverEntry.ts)) exposing SSR-safe types/utilities only.

All entries compile via [tasks/rollup.aichat.js](tasks/rollup.aichat.js) to `dist/es/` (`cds--` prefix) and `dist/es-custom/` (`cds--custom` prefix, avoiding `@carbon/angular-components` collisions). TypeDoc emits to `dist/docs/`.

** Before running any build commands**: Ask the user if `npm run aiChat:start` is already running. Most developers keep it running continuously. Running a parallel build will cause race conditions and intermittent failures.

## Where things live

- [src/chat/](src/chat/) — the chat application. Do most feature work here.
  - `AppShell.tsx`, `ChatAppEntry.tsx`, `AppShellPanels.tsx`, `AppShellWriteableElements.tsx` — top-level composition.
  - `store/` — Redux-style store. See [src/chat/store/AGENTS.md](src/chat/store/AGENTS.md) for hard rules (pure reducers, synchronous dispatch, no middleware).
  - `services/` — long-lived singletons wired in `ServiceManager.ts` and `loadServices.ts`. `ChatActionsImpl.ts` is the instance-facing API — public methods added here must also be reflected on the `ChatInstance` type in `instance/`.
  - `instance/` — the public `ChatInstance` object. Breaking changes here are breaking changes for every consumer; prefer additive API.
  - `events/` — typed pub/sub for the public event API. Event names and payloads are part of the public contract.
  - `schema/` — runtime message/config schema. Keep in sync with types in [src/types/](src/types/).
  - `hocs/`, `hooks/`, `contexts/`, `providers/` — React glue. Hooks reading the store should use `useSelector` from the local store, not bespoke subscriptions.
  - `languages/` — `intl-messageformat` string bundles. When adding a key, add it to every locale file in the same PR; English is the source of truth.
  - `components/` vs `components-legacy/` — **always author new UI in `components/`**. `components-legacy/` is closed to new components; bug fixes and refactoring transitions out are welcome. Lift a component to `@carbon/ai-chat-components` when it has no chat-specific state and could plausibly be consumed outside the chat app.
  - `ai-chat-components/` — React bindings (`@lit/react`) around the sibling package's Lit components.
- [src/react/](src/react/) — public React wrapper components re-exported from the package root.
- [src/web-components/](src/web-components/) — Lit hosts. Kept thin: bridge props/events/slots to the React core.

## React/Lit Architecture Boundary

This package uses a hybrid architecture: React application code runs inside a Lit-managed shadow DOM host.

### The Boundary

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

### How It Works

1. **Lit Host**: [`ChatContainerReact`](src/react/ChatContainer.tsx:40) is a Lit custom element decorated with `@carbonElement("cds-aichat-react")`

2. **React Wrapper**: [`createComponent()`](src/react/ChatContainer.tsx:60) from `@lit/react` wraps the Lit host for React consumers

3. **Shadow DOM Setup**: The Lit host creates a shadow root and emits `"shadow-ready"` event in [`firstUpdated()`](src/react/ChatContainer.tsx:52)

4. **React Portal**: [`ChatContainer`](src/react/ChatContainer.tsx:183) waits for shadow root, creates mount div, and portals React app into it

5. **Extensibility**: User-defined content crosses the boundary via slots, not direct shadow DOM manipulation

### When to Work in Each Layer

**Lit layer** (`src/react/ChatContainer.tsx`, `ChatCustomElement.tsx`):

- Custom element registration and lifecycle
- Shadow DOM setup and management
- Slot projection for extensibility points
- Global style injection

**React layer** (everything else in `src/`):

- Application logic and state management
- UI components and interactions
- Store integration
- Service orchestration

### Common Patterns

**Passing data into shadow DOM**:

```typescript
// Lit host receives props
<cds-aichat-react .config=${config} />

// React portal reads from host
const config = wrapperElement.config;
```

**Passing content out via slots**:

```typescript
// React creates slotted element
const element = document.createElement('div');
element.setAttribute('slot', 'user-defined-response');
wrapper.appendChild(element);

// Lit host projects slot
<slot name="user-defined-response"></slot>
```

### Debugging Across the Boundary

**Shadow root not ready**:

- Check `"shadow-ready"` event is emitted
- Verify event listener is attached before event fires
- Check browser console for shadow DOM errors

**React not rendering**:

- Verify `.cds-aichat--react-app` div exists in shadow root
- Check React portal is created after shadow root ready
- Look for errors in React DevTools

**Slots not projecting**:

- Verify slot name matches between React and Lit
- Check element is appended to wrapper, not shadow root
- Ensure slot element is created before Lit renders

### References

- Lit host implementation: [`src/react/ChatContainer.tsx`](src/react/ChatContainer.tsx:40)
- React wrapper: [`src/react/ChatCustomElement.tsx`](src/react/ChatCustomElement.tsx:137)
- `@carbon/ai-chat-components` provides `@carbonElement` decorator and base classes

## Service Architecture

Services are orchestration boundaries that coordinate between the store, external APIs, and browser APIs.

### Initialization Order

Services are bootstrapped in [`createServiceManager()`](src/chat/services/loadServices.ts:36) with a specific dependency order:

1. **Core primitives**: namespace, userSessionStorageService
2. **Actions & EventBus**: action creators, event bus
3. **Store**: Redux-like store with reducers
4. **Business services**: historyService, messageService (depend on store)
5. **Store subscriptions**: copyToSessionStorage, fireStateChangeEvent
6. **Browser services**: themeWatcherService (depends on store + DOM)
7. **Post-init hooks**: theme activation, i18n setup, debug logging

### Dependency Pattern

Services **do not hold direct references to each other**. Instead, they resolve collaborators through [`ServiceManager`](src/chat/services/ServiceManager.ts:38):

```typescript
class MyService {
  constructor(private serviceManager: ServiceManager) {}

  doSomething() {
    // Resolve dependencies on-demand
    const state = this.serviceManager.store.getState();
    this.serviceManager.actions.updateState(newState);
  }
}
```

This pattern:

- Supports lazy initialization
- Handles circular dependencies
- Makes testing easier (stub only the manager)

### Service Archetypes

**1. Simple Data Adapter** (e.g., [`HistoryService`](src/chat/services/HistoryService.ts:23))

- Reads config and state
- Transforms external data
- Dispatches actions
- No internal state

```typescript
class HistoryService {
  constructor(private serviceManager: ServiceManager) {}

  async loadHistory() {
    const state = this.serviceManager.store.getState();
    const customLoader = state.config.messaging?.customLoadHistory;
    const data = await customLoader?.();
    this.serviceManager.actions.loadHistory(transform(data));
  }
}
```

**2. Lifecycle Watcher** (e.g., [`ThemeWatcherService`](src/chat/services/ThemeWatcherService.ts:28))

- Manages browser API subscriptions
- Maintains internal state (observers, intervals)
- Explicit start/stop methods
- Updates store on external changes

```typescript
class ThemeWatcherService {
  private observer: MutationObserver | null = null;

  startWatching() {
    this.observer = new MutationObserver(() => {
      this.serviceManager.store.dispatch(UPDATE_THEME_STATE);
    });
  }

  stopWatching() {
    this.observer?.disconnect();
  }
}
```

**3. Orchestration Engine** (e.g., [`MessageService`](src/chat/services/MessageService.ts:155))

- Coordinates multiple sub-systems
- Manages queues and async flows
- Composes other coordinators
- Complex error handling

```typescript
class MessageService {
  private queue: MessageQueue;
  private inbound: InboundStreamingCoordinator;
  private outbound: OutboundMessageCoordinator;

  async sendMessage(text: string) {
    this.queue.enqueue(text);
    await this.outbound.send(text);
    this.inbound.startListening();
  }
}
```

### When to Create a New Service

Create a service when:

- Logic coordinates multiple store slices
- You need to manage browser API lifecycle (timers, observers, listeners)
- External API integration requires orchestration
- Logic is too complex for a single action creator

Don't create a service for:

- Simple state transformations (use reducers)
- One-off API calls (use action creators)
- Pure utility functions (use `src/utils/`)

### Testing Services

See [Testing Strategy](#testing-strategy) for the service testing pattern. Key points:

- Stub `ServiceManager` with only required fields
- Instantiate service directly (no DI container)
- Assert on mock calls and internal state
- Example: [`MessageService_spec.ts`](tests/services/spec/MessageService_spec.ts:87)
- [src/types/](src/types/) — public type surface. Anything exported through `aiChatEntry.tsx` is public API; treat edits with semver discipline. **Read [src/types/AGENTS.md](src/types/AGENTS.md) before editing** — TypeDoc output ships as the public docs site, is indexed into Elasticsearch, and is served by an MCP developer-helper. JSDoc here is product copy.
- [tests/](tests/) — Jest specs in `spec/` folders under `tests/<area>/` (e.g. `tests/store/spec/*_spec.ts`). Naming is `_spec.ts(x)`, not `.test.ts`, and tests are not colocated with source — opposite of `@carbon/ai-chat-components`. Areas: `store/`, `services/`, `instance/`, `config/`, `transforms/`, `utils/`. `setup.ts` installs DOM + testing-library setup; `test_helpers.ts` has shared fixtures.
- [docs/](docs/) — consumer-facing docs published via TypeDoc. See [docs/AGENTS.md](docs/AGENTS.md) before editing — these files ship to the public site.

## Build, test, lint

From this package directory:

````bash
npm run build      # rollup + typedoc
npm start          # rollup --watch + typedoc --watch + local doc server on :5001
npm test           # jest with coverage
npx jest path/to/file_spec.ts
npx jest -t "pattern"

## Testing Strategy

This package uses Jest for unit and integration tests. Tests are organized by what they validate:

### Test Categories

#### 1. Store & Hook Tests
**Location**: `tests/store/spec/`
**Purpose**: Validate Redux-like store behavior and custom hooks
**Pattern**: Create local test store, wrap components in `StoreProvider`, assert state changes

**Example**: `reactReduxShim_spec.tsx`
```typescript
const store = createAppStore(initialState);
render(
  <StoreProvider store={store}>
    <TestComponent />
  </StoreProvider>
);
store.dispatch(someAction());
expect(screen.getByText('expected')).toBeInTheDocument();
````

**When to add**:

- New store actions or reducers
- New `useSelector` or `useDispatch` usage patterns
- State-dependent component behavior

#### 2. Service Tests

**Location**: `tests/services/spec/`
**Purpose**: Validate service orchestration and side effects
**Pattern**: Stub `ServiceManager`, instantiate service directly, assert method calls and state

**Example**: `MessageService_spec.ts`

```typescript
const mockManager = {
  store: { getState: jest.fn(), dispatch: jest.fn() },
  actions: { addMessage: jest.fn() },
  eventBus: { emit: jest.fn() },
  instance: mockInstance,
};
const service = new MessageService(mockManager);
await service.sendMessage("test");
expect(mockManager.actions.addMessage).toHaveBeenCalled();
```

**When to add**:

- New service methods
- Service lifecycle changes (start/stop)
- Complex orchestration logic

#### 3. Component Tests

**Location**: `tests/components/spec/`
**Purpose**: Validate React component rendering and interactions
**Pattern**: Render with Testing Library, simulate user interactions, assert DOM state

**When to add**:

- New React components
- Component prop changes
- User interaction flows

#### 4. Integration Tests

**Location**: `demo/tests/` (Playwright)
**Purpose**: Validate end-to-end user flows across the full stack
**Pattern**: See `demo/AGENTS.md` for Playwright patterns

**When to add**:

- New user-facing features
- Cross-component workflows
- Config-dependent behavior

### Test Coverage Guidelines

**Required coverage**:

- All store actions and reducers
- All service public methods
- All user-facing component interactions

**Optional coverage**:

- Private helper functions (if complex)
- Edge cases (if they've caused bugs before)
- Performance-critical paths (with benchmarks)

### Running Tests Efficiently

**Single test file**:

```bash
npx jest path/to/file_spec.ts
```

**Single test by name**:

```bash
npx jest -t "test name pattern"
```

**Watch mode during development**:

```bash
npx jest --watch
```

**Coverage report**:

```bash
npm run test:coverage --workspace=@carbon/ai-chat
```

### Debugging Test Failures

**Test timeout**: Likely orphaned async operation or missing mock

- Check for unresolved promises
- Verify all timers are mocked with `jest.useFakeTimers()`
- Increase timeout: `jest.setTimeout(10000)`

**Flaky test**: Likely race condition or shared state

- Add `await waitFor()` for async updates
- Check for test pollution (shared mocks not reset)
- Run test in isolation: `npx jest --testNamePattern="flaky test" --runInBand`

**Mock not working**: Check mock is set up before import

- Move `jest.mock()` to top of file
- Use `jest.resetModules()` between tests if needed

## Gotchas

- **Custom store hooks**: `useSelector` and `useDispatch` come from `src/chat/store/hooks/` — **not** `react-redux`. Import from the local store.
- **ESM `.js` extensions in imports**: TS source uses explicit `.js` extensions on relative imports even when the file is `.ts`/`.tsx` (e.g. `import { foo } from "./bar.js"`). Jest's `moduleNameMapper` rewrites these at test time. Omitting the extension breaks the build.
- **Relaxed TS strictness**: `tsconfig` sets `strictNullChecks: false` and `strictFunctionTypes: false`. Don't assume null safety; check explicitly or add guards.
- **React runs inside shadow DOM**: the `cds-aichat-*` custom elements mount React into a shadow root. User-defined responses and writeable elements use slotted content; follow the existing patterns rather than reaching into the shadow tree.

## Accessibility Requirements

All UI changes must meet WCAG 2.1 AA standards:

### Keyboard Navigation

- All interactive elements must be keyboard accessible (Tab, Enter, Escape, arrow keys)
- Focus order must be logical and match visual layout
- Focus indicators must be visible (4.5:1 contrast ratio minimum)
- No keyboard traps - users can navigate away from all elements

### Screen Readers

- Use semantic HTML where possible (`<button>`, `<nav>`, `<main>`, etc.)
- Add ARIA labels/roles only when semantic HTML is insufficient
- Test with VoiceOver (macOS) or NVDA (Windows)
- Ensure all images have appropriate alt text
- Form inputs must have associated labels

### Visual & Layout

- Maintain color contrast ratios: 4.5:1 for text, 3:1 for UI components
- Support RTL layouts via CSS logical properties (`padding-inline-start`, `inset-inline-end`)
- Ensure UI is usable at 200% zoom
- Don't rely on color alone to convey information

### Testing

Before marking a UI task done:

1. Navigate the entire flow using only keyboard
2. Test with a screen reader (VoiceOver or NVDA)
3. Verify color contrast with browser DevTools
4. Test at 200% zoom
5. If RTL-relevant, test with `dir="rtl"` on root element

**Resources**:

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [Carbon Design System Accessibility](https://carbondesignsystem.com/guidelines/accessibility/overview)

## Definition of done

See root [AGENTS.md](../../AGENTS.md#definition-of-done) for the gate. Additionally: if you changed anything under `src/types/`, `aiChatEntry.tsx`, or `serverEntry.ts`, verify a consumer (`demo/` or an example) still builds against the new artifacts.

## Related Guidance

- **Parent guidance**: [Root AGENTS.md](../../AGENTS.md) - Monorepo-wide conventions
- **Store patterns**: [src/chat/store/AGENTS.md](src/chat/store/AGENTS.md) - Redux-like store rules
- **Type conventions**: [src/types/AGENTS.md](src/types/AGENTS.md) - TypeScript and JSDoc standards
- **Documentation**: [docs/AGENTS.md](docs/AGENTS.md) - Consumer-facing docs guidelines
- **Component library**: [../ai-chat-components/AGENTS.md](../ai-chat-components/AGENTS.md) - Lit component authoring
- **Code reviews**: [../../AGENTS_CODE_REVIEW.md](../../AGENTS_CODE_REVIEW.md)

## Troubleshooting

**Build fails**: Ensure `@carbon/ai-chat-components` is built first: `npm run build --workspace=@carbon/ai-chat-components`

**TypeDoc errors**: Verify all `@param` tags in JSDoc match actual function parameters

**React portal not rendering**: Check browser console for shadow DOM errors; verify `window.chatInstance` exists

## Authoring rules

- **Prefix discipline (CRITICAL — build-breaking)**: never hardcode `cds--` in SCSS or TSX class strings. Use `#{$prefix}--` in SCSS and the prefix helpers in TS, otherwise the `es-custom` build breaks.
- **RTL**: use CSS logical properties (`inline-start`, `block-end`, etc.). Validate via the demo's direction switcher before shipping.
- **Public API changes**: anything exported from `aiChatEntry.tsx`, `serverEntry.ts`, or `types/` is semver-visible. Coordinate with a `feat`/`fix!`/`BREAKING CHANGE` footer. JSDoc/TypeDoc rules: [src/types/AGENTS.md](src/types/AGENTS.md).
- **Store**: see [src/chat/store/AGENTS.md](src/chat/store/AGENTS.md). Reducers stay pure; side effects go through services or `store/actions.ts` / `store/subscriptions.ts`. `humanAgentReducers.ts` is a separate slice on purpose.
- **Services**: wire new services through `ServiceManager` and `loadServices`; dispose them in `ChatInstanceImpl.destroy()` and the matching `unloadServices()` teardown. See `tests/services/` for disposal patterns — leaking a subscription across instance re-creation is a common regression.
- **i18n**: no user-visible strings in code. Route through `languages/`.
- **Tests**: colocate helpers in `tests/test_helpers.ts`. Store tests should exercise reducers directly; service tests should use the mocks in `tests/services/`. For instance-level regressions, add to `tests/instance/`.
