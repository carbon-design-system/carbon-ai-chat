# services.md — `@carbon/ai-chat` services

Load this when adding, editing, or testing a service. Services are orchestration boundaries that coordinate the store, external APIs, and browser APIs.

Chat-instance services live in `src/sdk/services/`. View-owned classes, the ones that touch the DOM or `ChatViewState`, live in `src/chat/services/`; follow [the hook core contract](../src/chat/hooks/AGENTS.md) for them. The initialization, manager lookup, and teardown rules below apply to chat-instance services.

For assistant message flows, read [messaging ownership](../src/sdk/services/messaging/AGENTS.md). `MessageCoordinator` owns the private workflows. Pure data helpers live in `inbound/`, `outbound/`, and `state/`; view work goes through the narrow `presentation/` port. Human-agent sends and writes stay in `sdk/services/haa/`.

Keep the outbound queue, chunk FIFO, per-ID native write chains, and event queues separate. Their waits and release points differ. Shared event capture still serves legacy and human-agent paths; it is not a second assistant flow owner.

## Initialization order

See [`createServiceManager()`](../src/sdk/services/loadServices.ts) for service initialization order.

## Dependency pattern

Chat-instance services **do not hold direct references to each other**. They resolve collaborators on-demand through [`ServiceManager`](../src/sdk/services/ServiceManager.ts):

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

- **Simple data adapter:** [`HistoryService`](../src/sdk/services/HistoryService.ts) loads and transforms history data.
- **Mount-owned watcher:** [`ThemeWatcherService`](../src/chat/services/ThemeWatcherService.ts) watches the page's theme. It reads the DOM, so it lives in `chat/services/`: the container connects it at mount and disconnects it on release.
- **Orchestration engine:** [`MessageCoordinator`](../src/sdk/services/messaging/MessageCoordinator.ts) owns assistant flows through private workflows and pure state models.

## When to create a service

Put state transformations in reducers. Put pure utilities that conversation code uses in `src/sdk/utils/`, and view setup/cleanup helpers in `src/chat/utils/`.

## Who starts services

[`cds-aichat-container`](../src/web-components/cds-aichat-container/cds-aichat-container.ts) starts them, for every host. React starts nothing. The container calls [`bootPrebuiltChat`](../src/chat/utils/chatBoot.ts), which starts the chat through the internal `createChatSDK`, then [`attachMountView`](../src/chat/utils/attachMountView.ts), which creates `ChatViewState` and attaches the view's ports from [`createViewBindings`](../src/chat/services/createViewBindings.ts). Then it runs the host application's `onBeforeRender` and lets the renderer show the app. Release detaches the view, then shuts the chat down (see below). **Conversation services reach the view only through `serviceManager.view.current`**, which is `undefined` with no view attached, so each view call there must do nothing without one. **A Lit element reads the chat's view state, which holds the manager, from the context in [chat-view-state-context.ts](../src/web-components/shared/chat-view-state-context.ts)**, never from a singleton. The value is `undefined` before startup and after detach.

## Wiring & teardown

- Keep messaging workflows private to `MessageCoordinator`; do not register them or pure data helpers as services.
- Register new chat-instance services through [`ServiceManager`](../src/sdk/services/ServiceManager.ts) and [`loadServices`](../src/sdk/services/loadServices.ts).
- **Removing a host shuts its chat down.** The container's release retires the mount, then calls `ServiceManager.shutdown()`; boot calls it too when the host left while services were starting. Hosts never call it. Shutdown runs once; a repeat call returns the same promise. In order, it:
  - closes the store: every subscription goes, and later dispatches change nothing, so saved session state stays as it was at removal;
  - clears the event bus;
  - disconnects the human-agent service from the desk without ending the conversation there (`HumanAgentServiceImpl.shutdown()`). This comes before anything aborts, so an abort listener can't reach the real desk;
  - destroys `PublicStateService` and aborts uploads in `InputActionsService`;
  - stops `MessageCoordinator` through restart's own steps (`MessageCoordinator.shutdown()`), which cancels every request and ends its timers.
- **A new service with live work adds its stop to `ServiceManager.shutdown()`.** Keep the timer id or controller you create, so you can stop it there. A store subscription needs nothing more; closing the store drops it. Late async work that reaches outside the store, such as a host callback or a global, checks `serviceManager.isShutdown` first.
- `destroySession()` resets session data; it is not a shutdown.
- Public methods on `ChatInstanceService` must be reflected on the `ChatInstance` type in [`src/types/instance/ChatInstance.ts`](../src/types/instance/ChatInstance.ts). The instance object is constructed in [`src/chat/utils/chatBoot.ts`](../src/chat/utils/chatBoot.ts).

## Testing services

Follow [tests.md](tests.md#service-example) when testing a service.

## Related guidance

- [packages/ai-chat/AGENTS.md](../AGENTS.md) — package overview
- [src/sdk/store/AGENTS.md](../src/sdk/store/AGENTS.md) — store rules
