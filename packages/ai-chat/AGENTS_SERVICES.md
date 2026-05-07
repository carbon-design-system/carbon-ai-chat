# AGENTS_SERVICES.md — `@carbon/ai-chat` services

Load this when adding, editing, or testing a service. Services are orchestration boundaries that coordinate the store, external APIs, and browser APIs.

## Initialization order

Services bootstrap in [`createServiceManager()`](src/chat/services/loadServices.ts#L36) in this order:

1. Core primitives — `namespace`, `userSessionStorageService`
2. Actions & event bus — action creators, event bus
3. Store — Redux-like store with reducers
4. Business services — `historyService`, `messageService` (depend on store)
5. Store subscriptions — `copyToSessionStorage`, `fireStateChangeEvent`
6. Browser services — `themeWatcherService` (depends on store + DOM)
7. Post-init hooks — theme activation, i18n setup, debug logging

## Dependency pattern

Services **do not hold direct references to each other**. They resolve collaborators on-demand through [`ServiceManager`](src/chat/services/ServiceManager.ts#L38):

```typescript
class MyService {
  constructor(private serviceManager: ServiceManager) {}

  doSomething() {
    const state = this.serviceManager.store.getState();
    this.serviceManager.actions.updateState(newState);
  }
}
```

This supports lazy initialization, handles circular dependencies, and makes testing easier (stub only the manager).

## Archetypes

### 1. Simple data adapter

Reads config and state, transforms external data, dispatches actions, holds no internal state.

Example: [`HistoryService`](src/chat/services/HistoryService.ts#L23)

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

### 2. Lifecycle watcher

Manages browser API subscriptions, maintains internal state (observers, intervals), exposes explicit start/stop, updates store on external changes.

Example: [`ThemeWatcherService`](src/chat/services/ThemeWatcherService.ts#L28)

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

### 3. Orchestration engine

Coordinates multiple sub-systems, manages queues and async flows, composes other coordinators, handles complex error paths.

Example: [`MessageService`](src/chat/services/MessageService.ts#L155)

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

## When to create a service

**Yes** when:

- Logic coordinates multiple store slices.
- You need to manage browser API lifecycle (timers, observers, listeners).
- External API integration requires orchestration.
- Logic is too complex for a single action creator.

**No** when:

- Simple state transformation → reducer.
- One-off API call → action creator.
- Pure utility → `src/utils/`.

## Wiring & teardown

- Register new services through [`ServiceManager`](src/chat/services/ServiceManager.ts) and [`loadServices`](src/chat/services/loadServices.ts).
- **Dispose** them in `ChatInstanceImpl.destroy()` and the matching `unloadServices()` teardown. Leaking a subscription across instance re-creation is a common regression — see [tests/services/](tests/services/) for disposal patterns.
- Public methods on `ChatActionsImpl` must be reflected on the `ChatInstance` type in [src/chat/instance/](src/chat/instance/).

## Testing services

See [AGENTS_TESTS.md](AGENTS_TESTS.md) for the full pattern. Key points:

- Stub `ServiceManager` with only required fields.
- Instantiate the service directly (no DI container).
- Assert on mock calls and internal state.
- Reference: [`MessageService_spec.ts`](tests/services/spec/MessageService_spec.ts#L87)

## Related guidance

- [packages/ai-chat/AGENTS.md](AGENTS.md) — package overview
- [AGENTS_TESTS.md](AGENTS_TESTS.md) — testing strategy
- [src/chat/store/AGENTS.md](src/chat/store/AGENTS.md) — store rules
