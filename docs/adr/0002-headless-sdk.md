---
status: proposed
date: 2026-09-15
feedback-by: 2026-09-17
discussion:
epic: https://github.com/carbon-design-system/carbon-ai-chat/issues/1728
supersedes:
superseded-by:
---

# ADR-0002: Ship a headless SDK so you can compose your own chat

## Summary

**Problem.** `@carbon/ai-chat` gives you a complete chat interface, and you customize it only where it leaves room: config, theming, your own response types, and a set of slots. When you need more, such as replacing the message list, changing how built-in responses render, or laying the chat out differently, there's no path. `@carbon/ai-chat-components` has the building blocks, but nothing runs the conversation behind them unless you take the whole prebuilt interface.

**Proposal.** Add a headless entry point, `@carbon/ai-chat/sdk`. It runs the conversation without rendering anything: sending, streaming responses, history, human-agent chats, and conversation state. You compose the interface yourself from `@carbon/ai-chat-components`, your own components, or both. The existing React and web-component entry points keep working, and every callback keeps receiving the object it receives today.

**Feedback wanted.**

- If you've outgrown `@carbon/ai-chat`'s customization points, which piece did you need to replace? Does this surface let you do it?
- What's missing from the conversation surface in Proposal for the chat you'd compose?
- Would an experimental 1.x release, whose shape can change before GA, be stable enough to build on? What would you need to see first?

## Motivation

### Customization stops at the slots

`@carbon/ai-chat` is built for hosts that want a working chat quickly. You shape it through config and theming tokens. You extend it at points it defines: your own response types, a message footer, markdown renderers, editor extensions, and about fifteen slots. Three of those slots are whole panels.

Those points let you add, and let you turn some pieces off. You can hide the header or the prompt line and put your own in a slot, but the result still sits inside the prebuilt layout. You can't replace the message list, change how most built-in response types render, or rearrange the chat's regions. A host that needs any of that has two choices. It lives with the prebuilt piece, or it leaves `@carbon/ai-chat` and rebuilds everything the chat does behind its interface.

### The building blocks exist, but the conversation doesn't

`@carbon/ai-chat-components` already ships many of the interface pieces as standalone web components, with React wrappers: the chat shell, prompt line, markdown, cards, tables, file uploads, feedback, reasoning steps, and more. It doesn't ship a message list, message bubbles, or a component for every built-in response type, so a composed chat renders those itself. A host could arrange those pieces, and its own components, into the chat it needs.

What it can't get is what makes them a chat. That means sending messages, streaming responses, loading history, handing off to a human agent, and tracking state. All of that lives in `@carbon/ai-chat`, and today it can't start without mounting the prebuilt interface.

### Related, not decided here

A host using `@carbon/ai-chat`'s web components still ships React, because each one mounts a React tree inside. Removing that dependency is separate work, tracked in [#1951](https://github.com/carbon-design-system/carbon-ai-chat/issues/1951). This proposal doesn't decide it. It does help: the SDK's code imports no React, so the prebuilt interface can later be rebuilt on the same React-free core.

## Proposal

```ts
import '@carbon/ai-chat-components/es/components/chat-shell/index.js';
import '@carbon/ai-chat-components/es/components/prompt-line/index.js';
import { createChatSDK } from '@carbon/ai-chat/sdk';

const chat = await createChatSDK({
  namespace: 'support',
  messaging: {
    customSendMessage: async (request, options, instance) => {
      const response = await callYourBackend(request);
      await instance.messaging.addMessage(response);
    },
  },
});

// Render the conversation with our components, your own, or a mix.
renderMessages(chat.state.messages.get());
const unsubscribe = chat.state.messages.subscribe(renderMessages);

// Wire whatever input you composed to the conversation.
onUserSubmit((text) => chat.messaging.send(text));

// When your chat goes away.
unsubscribe();
chat.release();
```

`renderMessages` and `onUserSubmit` stand in for your own interface code. The SDK doesn't care which components draw the chat.

`createChatSDK` starts a conversation with no interface, and resolves once it's ready. It returns a handle: the conversation surface, plus the verbs that manage the conversation's lifetime. Callbacks receive the conversation surface without those verbs, so code the chat calls into can't tear down the chat that called it.

The existing entry points keep their shape. `ChatContainer`, `ChatCustomElement`, and the web components keep handing you `ChatInstance`, which now includes the SDK's conversation surface as a named part of it.

### Reference: packaging and timing

- **The entry point is `@carbon/ai-chat/sdk`**, in the existing package: same version, same release.
- **It imports nothing from the interface, React, or Lit**, so you can compose with any component library. CI enforces that boundary. [#1732](https://github.com/carbon-design-system/carbon-ai-chat/issues/1732), which adds the SDK's boot pipeline, picks the tool.
- **`react`, `react-dom`, and `@carbon/web-components` stay required peer dependencies** of the package, as `react` does for `@carbon/ai-chat-components`. They stay required until `@carbon/ai-chat`'s web components no longer need React. The first major release after that marks `react` and `react-dom` optional, needed only if you import a React entry point.
- **An experimental release may ship in 1.x**, tagged `@experimental`. GA is planned for 2.0.0 but doesn't block it. If the surface isn't ready, GA lands in a 2.x minor.

### Reference: `createChatSDK` and the handle

```ts
declare function createChatSDK(config?: ChatSDKConfig): Promise<ChatSDKHandle>;

interface ChatSDKHandle extends ChatSDKInstance {
  /** Drop this handle's claim on the conversation. Meaning: ADR-0003. */
  release(): void;
  /** End the conversation now. Meaning: ADR-0003. */
  destroy(): void;
  /** Replace the config. A field you leave out returns to its default. */
  updateConfig(next: ChatSDKConfig): Promise<void>;
}
```

- **It needs no DOM element.**
- **It resolves after boot finishes**: the language pack is loaded, services are built, persisted state is restored, and history is loaded through your `customLoadHistory`. The prebuilt interface waits for its main window to open before loading history. The SDK has no window, so it loads during boot. It rejects if boot fails.
- **It can resolve to a conversation that's already running**, rather than a new one. It rejects when another live handle already holds the same namespace. [ADR-0003](0003-chat-survives-remount.md) defines both, and what a handle does after `destroy()`.
- **`updateConfig` replaces the config rather than merging into it**, the same way the React and web-component shells apply a changed config today. It resolves once the change is applied.
- **A new `serviceDeskFactory` never cuts a live human-agent conversation.** The running service desk stays until that conversation ends, then the new factory takes over. To switch desks now, call `serviceDesk.endConversation()` first. The same rule applies when a shell's props change, and when a remount adopts a running chat ([ADR-0003](0003-chat-survives-remount.md)).
- **`createChatSDK` and `updateConfig` copy the plain data they're given.** Functions and class instances are kept by reference. Changing your config object afterward has no effect.

### Reference: the instance types

```ts
interface ChatSDKInstance {
  messaging: ChatInstanceMessaging; // gains send()
  serviceDesk: ChatInstanceServiceDeskActions;
  state: ChatSDKState;
  on(handlers: SDKHandlers): this;
  off(handlers: SDKHandlers): this;
  once(handlers: SDKHandlers): this;
}

type SDKHandlers =
  | TypeAndHandler<ChatSDKInstance, ChatSDKEventType>
  | TypeAndHandler<ChatSDKInstance, ChatSDKEventType>[];

interface ChatInstance extends ChatSDKInstance {
  // Every member ChatInstance has today, unchanged.
  // on, off, and once are restated over every event, with handlers that receive ChatInstance.
  on(
    handlers: TypeAndHandler<ChatInstance> | TypeAndHandler<ChatInstance>[]
  ): this;
  // ...
}
```

- **`ChatInstance` extends `ChatSDKInstance`.** Nothing is removed from `ChatInstance`, and there's no separate type for the interface half.
- **`ChatSDKInstance` holds only the conversation:** `messaging`, `serviceDesk`, `state`, and the event bus.
- **Everything else stays on `ChatInstance` alone:** view changes, panels, input, focus, scrolling, loading indicators, writeable elements, `destroySession()`, and `getState()`.

### Reference: callbacks

The config types that carry callbacks take the instance type as a parameter. The config the shells take today, `PublicConfig`, binds it to `ChatInstance`.

```ts
interface ChatSDKConfig<I extends ChatSDKInstance = ChatSDKInstance> {
  messaging?: PublicConfigMessaging<I>; // customSendMessage, customLoadHistory
  serviceDeskFactory?: (
    parameters: ServiceDeskFactoryParameters<I>
  ) => Promise<ServiceDesk>;
  serviceDesk?: ServiceDeskPublicConfig;
  namespace?: string;
  locale?: string;
  strings?: DeepPartial<LanguagePack>;
  isReadonly?: boolean;
  debug?: boolean;
  onError?: (data: OnErrorData) => void;
  upload?: UploadConfig;
  persistedState?: PersistedStateConfig<ChatSDKPersistableState>;
  lifecycle?: { releaseGraceMs?: number }; // ADR-0003
}

interface PublicConfig extends Omit<
  ChatSDKConfig<ChatInstance>,
  'persistedState'
> {
  persistedState?: PersistedStateConfig<PersistableState>; // today's shape
  lifecycle?: {
    releaseGraceMs?: number;
    onUnmount?: 'release' | 'destroy';
    reuseInstance?: boolean; // 1.x only
  }; // ADR-0003
  // every other field PublicConfig has today
}

type EventBusHandler<T extends BusEvent = BusEvent, I = ChatInstance> = (
  event: T,
  instance: I
) => unknown;
interface TypeAndHandler<
  I = ChatInstance,
  E extends BusEventType = BusEventType,
> {
  type: E;
  handler: EventBusHandler<BusEvent, I>;
}
```

A config field belongs to `ChatSDKConfig` when the conversation behaves differently without it, even with no interface. Every field not shown above stays on `PublicConfig` alone, including `assistantName`, `shouldSanitizeHTML`, `persistFeedback`, `history`, `header`, `layout`, `launcher`, `homescreen`, `input`, `markdown`, and theming.

- **Every callback on `PublicConfig` keeps receiving `ChatInstance`.**
- **A callback written for the SDK works unchanged on `PublicConfig`.**
- **`ChatSDKConfig` rejects a callback that uses interface members**, at compile time.
- **`PublicConfig` isn't assignable to `ChatSDKConfig`.** The SDK can only supply a `ChatSDKInstance`, so a callback that expects more would fail at runtime.
- **The new parameters on `EventBusHandler` and `TypeAndHandler` come after the existing ones, and default to today's types.** An existing `EventBusHandler<BusEventReceive>` or `TypeAndHandler` annotation keeps its meaning.
- **`PublicConfig` restates `persistedState` with today's full shape**, so a shell host's `onStateChange` keeps receiving every persisted field.

Under `tsc --strict`, all six rules hold. Restating `on`, `off`, and `once` on `ChatInstance` compiles, and `ChatInstance` stays assignable to `ChatSDKInstance`.

### Reference: conversation state

```ts
interface ChatStore<T> {
  get: () => T;
  subscribe: (listener: (value: T) => void) => () => void;
}

interface ChatSDKState {
  /** Every message in the conversation, oldest first, including a response still streaming. */
  messages: ChatStore<readonly Message[]>;
  /** 'ready', 'submitted' (sent, nothing back yet), 'streaming', or 'error'. */
  status: ChatStore<'ready' | 'submitted' | 'streaming' | 'error'>;
  /** The error behind status 'error', or null. The same object onError receives. */
  error: ChatStore<Readonly<OnErrorData> | null>;
  humanAgent: ChatStore<PublicChatHumanAgentState>;
  activeResponseId: ChatStore<string | null>;
  /** Files attached to the next message, in the order they were added. */
  pendingUploads: ChatStore<readonly PendingUpload[]>;
  /** True while any pending upload is still uploading. */
  hasInFlightUploads: ChatStore<boolean>;
}

interface PendingUpload {
  id: string;
  name: string;
  status: 'uploading' | 'done' | 'error';
  /** Why the upload failed: the message of the error your onFileUpload threw. */
  error?: string;
}
```

- **`subscribe` fires only when the value changes, never when you subscribe.** Call `get()` for the current value.
- **`get()` returns the same frozen reference until the next notification.** A memoized selector or `React.memo` above a store is safe.
- **`get` and `subscribe` are bound functions**, so `useSyncExternalStore(store.subscribe, store.get)` works as written. The store objects on `state` are stable too.
- **The stores add nothing to browser storage.** `messages`, `status`, `error`, `activeResponseId`, and `hasInFlightUploads` are never written there. `humanAgent` reflects connection state that the chat already saves to session storage today, and that doesn't change.
- **`status` becomes `'error'` when a send fails for good or history fails to load**, and `error` holds the same `OnErrorData` that `onError` receives. `OnErrorData` gains an optional `messageID`, so a composed chat can tell which message failed. Hosts reading `onError` today see only a new optional field. The next successful send, or `messaging.restartConversation()`, sets `status` back and clears `error`.
- **`getState()` and the `STATE_CHANGE` event stay on `ChatInstance`, not deprecated, through 2.0.** They go away later, when the prebuilt interface's state gets its own public shape.

### Reference: persisted state

The chat saves session state to `sessionStorage`, or hands it to your `persistedState.onStateChange`. It's still one object per namespace. What the SDK saves is the part the conversation needs:

| Item | Saved by |
| --- | --- |
| `humanAgentState`: `isConnected`, `isSuspended`, `responseUserProfile`, `responseUserProfiles`, `serviceDeskState` | The SDK |
| `viewState`, `homeScreenState`, `disclaimersAccepted`, `hasSentNonWelcomeMessage`, `showUnreadIndicator` | The prebuilt interface |
| `launcherIsExpanded`, `launcherShouldStartCallToActionCounterIfEnabled` | The prebuilt interface, until 2.0.0 removes them along with the built-in launcher |

- **`ChatSDKPersistableState` is `{ humanAgentState }`.** A composed chat's `onStateChange` receives only that, and its `initialState` needs only that.
- **`PublicConfig` keeps today's `PersistableState`**, so a shell host sees no change.

### Reference: messaging and uploads

```ts
interface ChatInstanceMessaging {
  // today's members, plus:
  send(message: string | MessageRequest, options?: SendOptions): Promise<void>;
  addFile(file: File): Promise<{ id: string }>;
  removeFile(id: string): void;
}
```

- **`messaging.send(message, options?)` is added to `messaging`**, with the same signature and settlement as `instance.send` today. It rejects when `isReadonly` is set, or while `state.hasInFlightUploads` is true. The files in `state.pendingUploads` go out with the message.
- **`addFile` runs the same pipeline the prebuilt input uses.** It checks `upload.accept`, `maxFileSizeBytes`, and `maxFiles`, then calls your `onFileUpload`. During a human-agent conversation, it hands the file to the service desk instead.
- **`addFile` resolves with the file's `id` once the file is accepted and its upload starts.** It rejects when uploads are off, when there's no `onFileUpload`, or when the file breaks a limit. The upload's progress and failure show up in `state.pendingUploads`.
- **`removeFile(id)` aborts an upload in progress, or removes a finished one** from the next message. An unknown `id` does nothing.
- **`messaging` also gains `stop()`, `regenerate()`, and a way to mark a turn failed.** Each one's shape is settled in its own issue. Because they live on `messaging`, all three are part of the SDK surface.
- **Root `send` and `restartConversation` are deprecated in 1.x** (`restartConversation` already is) **and removed in 2.0.0.**

### Reference: human-agent conversations

```ts
interface ChatInstanceServiceDeskActions {
  // today's members (endConversation, updateIsSuspended), plus:
  startConversation(messageID?: string): Promise<void>;
}
```

- **`startConversation` does what the connect card's button does**, for a `connect_to_agent` response in the conversation. Without `messageID`, it uses the latest one.
- **It rejects when there's no such response, no service desk configured, or a human-agent conversation is already active.**
- **`serviceDesk.skipConnectHumanAgentCard` keeps working**, and starts one automatically as it does today.

### Reference: events

`ChatSDKEventType` is the 20 events a conversation fires without an interface:

- **Messages:** `pre:send`, `send`, `pre:receive`, `receive`, `userDefinedResponse`, `chunk:userDefinedResponse`, `stopStreaming`
- **Lifecycle:** `chat:ready`, `history:begin`, `history:end`, `pre:restartConversation`, `restartConversation`
- **Human agents:** `human_agent:pre:receive`, `human_agent:receive`, `human_agent:pre:send`, `human_agent:send`, `human_agent:pre:startChat`, `human_agent:pre:endChat`, `human_agent:endChat`, `human_agent:areAnyAgentsOnline`

Subscribing to any other event on a `ChatSDKInstance` is a compile error. `ChatInstance` accepts every event, as today. `feedback` and `state:change` are among the events that stay with the prebuilt interface.

## Consumer impact

**If you render the chat with `ChatContainer`, `ChatCustomElement`, or a web component, nothing breaks in 1.x.** The types you annotate keep compiling, and your callbacks keep receiving `ChatInstance`. One exception: if you implement `ChatInstance` yourself, for example as a test fake, add the new members: `state`, `messaging.send`, `messaging.addFile`, `messaging.removeFile`, and `serviceDesk.startConversation`.

Your config, `persistedState` shape, and event subscriptions work as they do today. `isReadonly`, uploads, and the human-agent connect card behave the same. The new stores and verbs are there if you want them.

**One runtime change is a fix: a new `serviceDeskFactory` no longer ends a live human-agent conversation.** Today, a factory created inline in a component is a new function on every render. A re-render during an agent chat ends that chat. After this change the chat continues, and the new factory takes over once the conversation ends. If you swap factories on purpose to move a user to another desk mid-conversation, call `instance.serviceDesk.endConversation()` first.

Two things change what you write.

**`instance.send` is deprecated in 1.x, and removed along with the already-deprecated `instance.restartConversation` in 2.0.0.** Your editor strikes both through, and calling either logs a console warning.

```ts
// Before
await instance.send('Hello');
instance.restartConversation();

// After
await instance.messaging.send('Hello');
instance.messaging.restartConversation();
```

**Conversation state gets stores on `instance.state`.** You don't have to use them: `getState()` and `STATE_CHANGE` keep working. They replace the hand-written comparison you need today to watch one field.

```ts
// Before
instance.on({
  type: BusEventType.STATE_CHANGE,
  handler: ({ previousState, newState }) => {
    if (previousState.activeResponseId !== newState.activeResponseId) {
      onActiveResponseChange(newState.activeResponseId);
    }
  },
});

// After
instance.state.activeResponseId.subscribe(onActiveResponseChange);
```

**If you move a callback from the full chat to the SDK**, check its calls. A callback that uses interface members, such as a loading indicator or a custom panel, doesn't compile against `ChatSDKConfig`. Annotate it `ChatSDKInstance` and remove the interface calls. A headless host has nothing for them to act on.

## Drawbacks

- **Composing means owning the interface.** A composed chat is yours to lay out, keep accessible, and update when `@carbon/ai-chat`'s prebuilt interface gains a feature. That includes the message list and any built-in response type without a component. The prebuilt chat stays the faster path for hosts it fits.
- **React stays installed.** `@carbon/ai-chat` requires `react` and `react-dom` as peer dependencies, and `@carbon/ai-chat-components` requires `react`. npm 7+ and pnpm install them for a composed chat even if it uses only web components and never imports React. Making them optional would break hosts that rely on that automatic install, so it waits for the first major release after `@carbon/ai-chat`'s web components stop needing React.
- **One package makes the boundary a rule, not a wall.** A separate package would make importing interface code from the SDK impossible. Here, CI has to catch it.
- **GA has no fixed release.** 2.0.0 is the aim, but it won't hold up the major.
- **There are two types for one conversation.** You keep the handle for `release`, `destroy`, and `updateConfig`, and pass the instance around. `on()` returns the type it was called on, so a chain that starts from the handle keeps the handle. Pass the handle where a `ChatSDKInstance` is expected, though, and its type loses the lifecycle verbs.
- **Public types gain a type parameter.** `ChatSDKConfig<I>`, `PublicConfigMessaging<I>`, `ServiceDeskFactoryParameters<I>`, `EventBusHandler<T, I>`, and `TypeAndHandler<I>` show it in the API reference, and most readers should ignore it. The event types default to `ChatInstance` while the config defaults to `ChatSDKInstance`. That's inconsistent, but existing annotations keep their meaning.
- **Switching service desks mid-conversation takes two steps.** A host must end the conversation before a new factory applies, where today the swap alone does it.
- **Conversation fields have two read paths through 2.x:** `getState().activeResponseId` and `state.activeResponseId`.
- **A composed chat owns the interface state the prebuilt chat saves for you.** Disclaimer acceptance, home screen state, and which view is open aren't saved by the SDK. A composed chat that needs them saves them itself.
- **`startConversation` needs a `connect_to_agent` response.** A host can't escalate to an agent from anywhere, such as a help button, unless its backend first returns that response.

## Alternatives

- **More customization points in `@carbon/ai-chat`.** Add slots and replace-this-piece props until hosts can swap what they need. It keeps everyone on the prebuilt chat, and it already works for some pieces: you can hide the header or prompt line and slot in your own. It lost as the only answer for three reasons. A replaced piece still sits inside the prebuilt layout. Every replaceable piece becomes a permanent public contract. And hosts keep finding the next one. Adding points where many hosts need them can still happen alongside the SDK.
- **A separate `@carbon/ai-chat-sdk` package.** It makes the boundary physical and could drop the React peers. It lost on version coupling. Both packages share the core, so every core change becomes a coordinated release. A host using both carries two dependencies that must match. A package can still be split out later.
- **Narrow every callback to `ChatSDKInstance`.** It's the simplest typing. It lost because hosts call interface members from their callbacks today. This repo's demo and examples call interface-only members more than 200 times, some of them from inside `customSendMessage` callbacks. Those would stop compiling, with the error on the config wiring rather than inside the callback.
- **Sibling conversation and interface types, composed into `ChatInstance`.** It's the purer split. It lost because nothing ever hands out the interface half by itself, and every member that touches both halves would be declared three times.
- **Lifecycle verbs on the instance.** It means one type instead of two. It lost because a `customSendMessage` handler could then destroy the chat in the middle of its own turn.
- **Callbacks declared with method syntax instead of a type parameter.** It avoids generics. It lost because TypeScript checks method parameters loosely: `ChatSDKConfig` would accept a callback that calls `changeView()`, which then fails at runtime in a headless host.
- **One event type for both instances, with documentation of which events never fire headless.** It needs no typing work. It lost because a composed chat could subscribe to an event that silently never arrives.
- **Start a human-agent conversation from anywhere, with no `connect_to_agent` response.** A help button could escalate directly. It lost because a service desk's `startChat` expects the real response and its transfer details, so the SDK would have to invent one.
- **A store for every state field, with `getState()` removed in 2.0.** It gives one read model at the major. It lost because it publishes a store for every interface field just before the React-removal work reshapes the prebuilt interface.

## Open questions

None.

## Decision

Not decided. Feedback by 2026-09-17 in the RFC discussion linked above.
