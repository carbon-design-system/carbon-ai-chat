# services.md — `@carbon/ai-chat` services

Load this when adding, editing, or testing a service. Services are orchestration boundaries that coordinate the store, external APIs, and browser APIs.

For view-owned classes, follow [the hook core contract](../src/chat/hooks/AGENTS.md). The initialization, manager lookup, and teardown rules below apply to chat-instance services.

## Initialization order

See [`createServiceManager()`](../src/chat/services/loadServices.ts) for service initialization order.

## Dependency pattern

Chat-instance services **do not hold direct references to each other**. They resolve collaborators on-demand through [`ServiceManager`](../src/chat/services/ServiceManager.ts):

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

- **Simple data adapter:** [`HistoryService`](../src/chat/services/HistoryService.ts) loads and transforms history data.
- **Lifecycle watcher:** [`ThemeWatcherService`](../src/chat/services/ThemeWatcherService.ts) watches browser theme changes and exposes start/stop methods.
- **Orchestration engine:** [`MessageService`](../src/chat/services/MessageService.ts) manages the message queue and inbound/outbound coordinators.

## When to create a service

Put state transformations in reducers and pure utilities or small setup/cleanup helpers in `src/chat/utils/`.

## Who starts services

[`cds-aichat-container`](../src/web-components/cds-aichat-container/cds-aichat-container.ts) starts them, for every host. React starts nothing. The container calls [`initServiceManagerAndInstance`](../src/chat/utils/chatBoot.ts), runs the host application's `onBeforeRender`, then lets the renderer show the app. **A Lit element reads the manager from the context in [service-manager-context.ts](../src/web-components/shared/service-manager-context.ts)**, never from a singleton. The value is `undefined` before startup and after detach.

## Wiring & teardown

- Register new chat-instance services through [`ServiceManager`](../src/chat/services/ServiceManager.ts) and [`loadServices`](../src/chat/services/loadServices.ts).
- **Full chat-instance teardown is still pending.** Detaching a host retires its mount — the renderer unmounts, listeners and bus handlers go, pending callbacks are dropped — but every store subscription, timer, and in-flight request a service owns keeps running. Keep the unsubscribe handle and the timer id you create, so the teardown that #1681 builds can dispose them. `destroySession()` resets session data; it is not a teardown.
- Public methods on `ChatInstanceService` must be reflected on the `ChatInstance` type in [`src/types/instance/ChatInstance.ts`](../src/types/instance/ChatInstance.ts). The instance object is constructed in [`src/chat/utils/chatBoot.ts`](../src/chat/utils/chatBoot.ts).

## Testing services

Follow [tests.md](tests.md#service-example) when testing a service.

## Related guidance

- [packages/ai-chat/AGENTS.md](../AGENTS.md) — package overview
- [src/chat/store/AGENTS.md](../src/chat/store/AGENTS.md) — store rules
