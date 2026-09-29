---
status: proposed
date: 2026-09-15
feedback-by: 2026-09-24
discussion:
epic: https://github.com/carbon-design-system/carbon-ai-chat/issues/2349
supersedes:
superseded-by:
---

# ADR-0002: Ship a headless SDK so you can compose your own chat

## Summary

**Problem.** `@carbon/ai-chat` gives you a complete chat interface, and you customize it only where it leaves room: config, theming, your own response types, and a set of slots. Past that there's no path. You can't replace the message list, change how a built-in response renders, or lay the chat out your own way. `@carbon/ai-chat-components` has the building blocks, but nothing runs the conversation behind them unless you take the whole prebuilt interface.

**Proposal.** Add a headless entry point, `@carbon/ai-chat/sdk`. It runs the conversation and renders nothing: sending, streaming, history, human-agent chats, and state. You compose the interface yourself, from `@carbon/ai-chat-components`, your own components, or both. React hosts can take the same thing as an optional `useChatSDK` hook. The existing entry points keep working, and every callback keeps receiving what it receives today. A sibling record, ADR-0003, decides how long a conversation lives. Either record reads on its own.

One part reaches every host, not just composed chats. Reading chat state moves to `instance.state`, where you watch one value and are woken only when that value changes. `getState()` and the `STATE_CHANGE` event are deprecated in 1.x and removed in 2.0.0.

## Motivation

### Customization stops at the slots

`@carbon/ai-chat` is built for hosts that want a working chat quickly. You shape it through config and theming tokens. You extend it at points it defines: your own response types, a message footer, markdown renderers, editor extensions, and sixteen slots, three of them whole panels.

Those points let you add, and let you turn some pieces off. You can hide the header or the prompt line and put your own in the slot beside it, but the result still sits inside the prebuilt layout. You can't replace the message list, change how most built-in response types render, or rearrange the chat's regions. A host that needs any of that has two choices. It lives with the prebuilt piece, or it leaves `@carbon/ai-chat` and rebuilds everything the chat does behind its interface.

### The building blocks exist, but the conversation doesn't

`@carbon/ai-chat-components` already ships many of the interface pieces as standalone web components, with React wrappers: the chat shell, prompt line, markdown, cards, tables, file uploads, feedback, reasoning steps, and more. It doesn't ship a message list, message bubbles, or a component for every built-in response type yet, so a composed chat renders those itself for now. Closing that gap is its own work, already under way: the message item shell ([#2309](https://github.com/carbon-design-system/carbon-ai-chat/issues/2309)), the message list shell ([#2310](https://github.com/carbon-design-system/carbon-ai-chat/issues/2310)), and the presentational response-type elements ([#1803](https://github.com/carbon-design-system/carbon-ai-chat/issues/1803)). This proposal doesn't wait on it. A host could arrange what exists, and its own components, into the chat it needs.

What it can't get is what makes them a chat. That means sending messages, streaming responses, loading history, handing off to a human agent, and tracking state. All of that lives in `@carbon/ai-chat`, and today it can't start without mounting the prebuilt interface.

### Related, not decided here

A host using `@carbon/ai-chat`'s web components still ships React, because each one mounts a React tree inside. Moving the shell off React is separate work, tracked in [#1951](https://github.com/carbon-design-system/carbon-ai-chat/issues/1951), which rebuilds the shell in Lit and leaves React only inside the message list. This proposal doesn't decide it. It does help: the SDK imports no React (or Lit), so that rebuilt shell runs on the same core.

## Proposal

A chat element in Lit, with plain elements standing in for whatever you'd compose from `@carbon/ai-chat-components` or your own library:

```ts
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import {
  createChatSDK,
  MessageResponseTypes,
  MessageState,
} from '@carbon/ai-chat/sdk';
import type {
  ChatSDKConfig,
  ChatSDKHandle,
  ChatSDKState,
  Message,
  TextItem,
} from '@carbon/ai-chat/sdk';

const config: ChatSDKConfig = {
  namespace: 'support',
  messaging: {
    customSendMessage: async (request, options, instance) => {
      const response = await callYourBackend(request);
      await instance.messaging.upsertMessage(
        response.id,
        MessageState.COMPLETE,
        () => response
      );
    },
  },
};

@customElement('my-chat')
class MyChat extends LitElement {
  @state() private messages: ChatSDKState['messages'] = [];
  @state() private status: ChatSDKState['status'] = 'loading';

  private chat?: ChatSDKHandle;
  private stopWatching: Array<() => void> = [];

  async connectedCallback() {
    super.connectedCallback();
    this.chat = await createChatSDK(config);
    if (!this.isConnected) {
      this.chat.release();
      return;
    }
    this.messages = this.chat.state.get().messages;
    this.status = this.chat.state.get().status;
    this.stopWatching = [
      this.chat.state.select(
        (s) => s.messages,
        (messages) => (this.messages = messages)
      ),
      this.chat.state.select(
        (s) => s.status,
        (status) => (this.status = status)
      ),
    ];
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopWatching.forEach((stop) => stop());
    this.chat?.release();
  }

  render() {
    const canSend = this.status === 'ready' || this.status === 'error';
    return html`
      ${this.messages.map(
        (message) => html`
          <div>${'input' in message ? 'User: ' : 'AI: '}${textOf(message)}</div>
        `
      )}
      <form @submit=${this.onSubmit}>
        <input
          name="text"
          placeholder="Say something..."
          ?disabled=${!canSend} />
        <button type="submit" ?disabled=${!canSend}>Submit</button>
      </form>
    `;
  }

  private onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const text = String(new FormData(form).get('text') ?? '').trim();
    if (text) {
      this.chat?.messaging.send(text);
      form.reset();
    }
  };
}

// Text only. A composed chat draws every other response type the same way.
function textOf(message: Message) {
  if ('output' in message) {
    return (message.output.generic ?? [])
      .filter(
        (item): item is TextItem =>
          item.response_type === MessageResponseTypes.TEXT
      )
      .map((item) => item.text ?? '')
      .join('');
  }
  return 'text' in message.input ? (message.input.text ?? '') : '';
}
```

The element draws the chat; the SDK never does. It reads two values and is woken only when one of them changes, sends what the form submits, and releases its claim on the conversation when it leaves the page. Nothing here is Lit-specific beyond the rendering: any component model that can hold a handle and subscribe to `state` writes the same steps.

The same chat in React, as a hook:

```tsx
import { useState } from 'react';
import { useChatSDK } from '@carbon/ai-chat/sdk/react';

export function Chat() {
  // `config` and `textOf` are the ones from the Lit sample.
  const { messages, sendMessage, status } = useChatSDK(config);
  const [input, setInput] = useState('');
  const canSend = status === 'ready' || status === 'error';

  return (
    <>
      {messages.map((message) => (
        <div key={message.id}>
          {'input' in message ? 'User: ' : 'AI: '}
          {textOf(message)}
        </div>
      ))}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (input.trim()) {
            sendMessage(input);
            setInput('');
          }
        }}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={!canSend}
          placeholder="Say something..."
        />
        <button type="submit" disabled={!canSend}>
          Submit
        </button>
      </form>
    </>
  );
}
```

`useChatSDK` is `createChatSDK` wrapped in the lifecycle a React component would write anyway: create on mount, release on unmount, and re-render when the messages, the status, or the error changes. It's optional. A React host can call `createChatSDK` directly, and the hook adds nothing you can't reach from the handle. It ships from its own entry point, `@carbon/ai-chat/sdk/react`, so the SDK itself stays free of React. See the React reference below.

`upsertMessage` is how a composed chat writes every message, streamed or not. The older `addMessage` and `addMessageChunk` stay on the prebuilt chat and aren't part of this surface.

`createChatSDK` starts a conversation with no interface, and resolves once it's ready. It returns a handle: the conversation surface, plus the verbs that manage the conversation's lifetime. Callbacks receive the conversation surface without those verbs, so code the chat calls into can't tear down the chat that called it.

The existing entry points keep their shape. `ChatContainer`, `ChatCustomElement`, and the web components keep handing you `ChatInstance`, which now extends the SDK's conversation surface. Where a shared type has an interface half, the SDK owns the `ChatSDK…` base and today's name extends it. Where it doesn't, the SDK uses today's type as is.

### Reference: naming and docs

- **A type gets a `ChatSDK…` name only when the SDK's shape differs from today's, and extension runs outward only.** Today's name then extends the SDK's: `PublicChatState extends ChatSDKState`, never the reverse, so no host annotation changes. A type the SDK reuses unchanged, such as `SendOptions` or `MessageRequest`, keeps its name. The wire types are the backend's contract, not the SDK's, so a composed chat receives every field the backend sends and honours or ignores the ones that describe layout.
- **A field added later to a type the SDK reaches is either conversation, or it triggers the split.** The split is additive: the `ChatSDK…` base takes the conversation fields, today's name extends it with the new one, and the SDK points at the base. A prebuilt host sees no change either way.
- **Everything an SDK reader can reach is tagged `@category SDK`**, so one documentation page is the whole surface. A shared type such as `Message` carries it alongside its current category, because TypeDoc collects every tag on a symbol.

### Reference: packaging and timing

- **The entry point is `@carbon/ai-chat/sdk`**, in the existing package: same version, same release.
- **It imports nothing from the interface, React, or Lit**, so you can compose with any component library. The React hook is a second entry point, `@carbon/ai-chat/sdk/react`, and is the only SDK code that imports `react`, so the rule holds for `@carbon/ai-chat/sdk` itself. CI enforces that boundary, and reports the entry point's declaration surface so every field added to a type the SDK reaches is reviewed against the rule above. [#1732](https://github.com/carbon-design-system/carbon-ai-chat/issues/1732), which adds the SDK's boot pipeline, picks the tools.
- **The wire types are exported from the entry point too**, with today's shapes: the message types, every response item type, and the two enums the samples import.
- **`react`, `react-dom`, and `@carbon/web-components` stay required peer dependencies** of the package, as `react` does for `@carbon/ai-chat-components`. They stay required until `@carbon/ai-chat`'s web components no longer need React. The first major release after that marks `react` and `react-dom` optional, needed only if you import a React entry point.
- **An experimental release may ship in 1.x**, tagged `@experimental`. GA is planned for 2.0.0 but doesn't block it. If the surface isn't ready, GA lands in a 2.x minor.
- **The SDK runs in a browser.** It touches no DOM, but `messaging.addFile` takes a `File`, and the service desks it drives assume one. A non-browser host is out of scope.

### Reference: `createChatSDK` and the handle

```ts
/**
 * Starts a conversation with no interface. Takes no DOM element and touches no DOM.
 *
 * Resolves once the chat is ready: services are built, persisted state is restored,
 * and history has come back from your `customLoadHistory`.
 * The prebuilt chat waits for its main window to open before loading history. The SDK
 * has no window, so it loads during boot. Rejects if boot fails. The promise is the
 * ready signal: there is no `chat:ready` event here, because it would fire before you
 * hold the handle.
 *
 * May resolve to a conversation that is already running instead of a new one, and
 * rejects when another live handle already holds the same namespace. ADR-0003 defines
 * both, and says what a handle does after `destroy()`.
 *
 * The config is copied: plain data is cloned, and functions and class instances are kept
 * by reference. Editing your config object afterward changes nothing.
 */
declare function createChatSDK(config?: ChatSDKConfig): Promise<ChatSDKHandle>;

/**
 * What `createChatSDK` hands back: the conversation, plus the verbs that manage its
 * life. Callbacks receive {@link ChatSDKInstance}, which has none of these verbs, so
 * code the chat calls into cannot tear down the chat that called it. Keep the handle:
 * it is the only route to them.
 *
 * @category SDK
 */
interface ChatSDKHandle extends ChatSDKInstance {
  /**
   * Drops this handle's claim on the conversation, without ending it. Calling it again
   * does nothing.
   *
   * If something takes the same namespace back soon enough — another `createChatSDK`
   * call, or a shell remounting — it picks up the same conversation, which is what
   * makes a remount cheap. If nobody does, the chat shuts down, and a later mount
   * starts fresh and reconnects to a human agent. How long that window lasts, and
   * exactly what shutdown does, is ADR-0003.
   */
  release(): void;

  /**
   * Ends the conversation now, whatever other claims exist, and lets nothing pick it up
   * afterward. Use it when the next mount must start clean, such as logout: it ends a
   * human-agent conversation and clears the chat's saved session state, so the next
   * user inherits nothing from the last one. Other handles to this chat stop working.
   * Exact rules: ADR-0003.
   */
  destroy(): void;

  /**
   * Replaces the config rather than merging into it, so a field you leave out returns
   * to its default. This is how the React and web-component shells already apply a
   * changed config. Resolves once the change has been applied, and copies what it is
   * given, as `createChatSDK` does.
   *
   * A new `serviceDeskFactory` never cuts a live human-agent conversation: the running
   * service desk stays until that conversation ends, and the new factory takes over
   * after it. To switch desks now, call `serviceDesk.endConversation()` first. The same
   * rule holds when a shell's props change, and when a remount adopts a running chat
   * (ADR-0003).
   */
  updateConfig(next: ChatSDKConfig): Promise<void>;
}
```

### Reference: the instance types

```ts
/**
 * The conversation, with no interface members. Every callback receives this type, and
 * the SDK hands it out. {@link ChatInstance} extends it, so a prebuilt-chat host has
 * all of this too.
 *
 * @category SDK
 */
interface ChatSDKInstance {
  /**
   * Every conversation verb: send, stop, regenerate, mark a turn failed, attach and
   * remove files, load history, and restart. See the messaging reference below.
   */
  messaging: ChatSDKInstanceMessaging;

  /** Human-agent actions: start, end, and suspend a conversation with a person. */
  serviceDesk: ChatInstanceServiceDeskActions;

  /**
   * Everything a headless chat can read: the conversation, the human-agent connection,
   * and the pending uploads. A host selects a value and is woken only when that value
   * changes. {@link ChatInstance} binds the same primitive to the wider state the
   * prebuilt chat keeps. See the state reference below.
   */
  state: ChatSDKStateAccess;

  /**
   * Subscribes to conversation events. Only {@link ChatSDKEventType} is accepted here:
   * subscribing to an interface event is a compile error, because a headless chat
   * never fires one.
   */
  on(handlers: ChatSDKHandlers): this;
  off(handlers: ChatSDKHandlers): this;
  once(handlers: ChatSDKHandlers): this;
}

/** @category SDK */
type ChatSDKHandlers =
  | TypeAndHandler<ChatSDKInstance, ChatSDKEventType>
  | TypeAndHandler<ChatSDKInstance, ChatSDKEventType>[];
```

`ChatInstance`, what the React and web-component chat hands out, extends `ChatSDKInstance` and keeps every member it has today: view changes, panels, input, focus, scrolling, loading indicators, writeable elements, `destroySession()`, and `getState()`. It binds `state` to the wider `PublicChatState`, and restates `on`, `off`, and `once` over every event, with handlers that receive `ChatInstance`. This split removes nothing from it, and there is no separate type for the interface half.

### Reference: callbacks

```ts
/**
 * The conversation half of today's `PublicConfigMessaging`, which now extends this.
 * Today's type keeps `messageLoadingIndicatorTimeoutSecs` and
 * `showStopButtonImmediately`, because both mean nothing without an interface.
 *
 * @category SDK
 */
interface ChatSDKConfigMessaging<I extends ChatSDKInstance = ChatSDKInstance> {
  /** Today's signature, receiving `I`. */
  customSendMessage?: (
    request: MessageRequest,
    options: CustomSendMessageOptions,
    instance: I
  ) => Promise<void> | void;
  /** Today's signature, receiving `I`. */
  customLoadHistory?: (instance: I) => Promise<HistoryItem[]>;
  /** Starts with an empty conversation instead of requesting a welcome message, as today. */
  skipWelcome?: boolean;
  /**
   * How long a send may go unanswered before it fails and `customSendMessage`'s abort
   * signal fires, as today. Answered means an `upsertMessage` for that turn.
   */
  messageTimeoutSecs?: number;
}

/**
 * The config a composed chat passes to `createChatSDK`.
 *
 * @category SDK
 *
 * A field belongs here when the conversation behaves differently without it, even with
 * no interface. Every field not listed stays on {@link PublicConfig} alone: `locale`,
 * `strings`, `header`, `launcher`, `input`, theming, and the rest of the interface.
 * There is no language pack here because the SDK writes no text — see below.
 *
 * `I` is the instance type every callback in this config receives. It defaults to the
 * conversation half, and {@link PublicConfig} binds it to {@link ChatInstance}. A
 * callback that uses interface members is a compile error here, and a callback written
 * for the SDK works unchanged on the full config.
 */
interface ChatSDKConfig<I extends ChatSDKInstance = ChatSDKInstance> {
  /** `customSendMessage` and `customLoadHistory`, both receiving `I`. */
  messaging?: ChatSDKConfigMessaging<I>;
  serviceDeskFactory?: (
    parameters: ServiceDeskFactoryParameters<I>
  ) => Promise<ServiceDesk>;
  /** The session settings a service desk needs. See the human-agent reference below. */
  serviceDesk?: ChatSDKServiceDeskConfig;
  namespace?: string;
  /** Blocks sending. `messaging.send` rejects while this is set. */
  isReadonly?: boolean;
  debug?: boolean;
  onError?: (data: ChatSDKErrorData) => void;
  /**
   * The limits `messaging.addFile` enforces, and the `onFileUpload` that does the
   * transfer. See the uploads reference below.
   */
  upload?: ChatSDKUploadConfig;
  /**
   * Where the human-agent connection is saved, so it survives a page reload. A chat
   * created with `createChatSDK` stores nothing itself. See the reference below.
   */
  humanAgentState?: ChatSDKPersistedStateConfig<PersistedHumanAgentState>;
  /**
   * `releaseGraceMs`: how long a released conversation waits to be picked back up
   * before it shuts down. ADR-0003 defines the type and the default.
   */
  lifecycle?: ChatSDKLifecycleConfig;
}

/**
 * The config the shells take today. It binds the callback instance type to
 * {@link ChatInstance}, so every callback keeps receiving what it receives now.
 *
 * It is deliberately not assignable to {@link ChatSDKConfig}: the SDK can only supply
 * the conversation half, so a callback expecting interface members would fail at
 * runtime. The SDK's `humanAgentState` key is dropped here, because `persistedState`
 * already does that job for a shell host and saves more besides. One key per config,
 * never two ways to seed the same state.
 */
interface PublicConfig extends Omit<
  ChatSDKConfig<ChatInstance>,
  'humanAgentState'
> {
  /** Today's type: the SDK's fields plus the two loading-indicator timings. */
  messaging?: PublicConfigMessaging;
  /** Today's type: the SDK's fields plus `skipConnectHumanAgentCard`. */
  serviceDesk?: ServiceDeskPublicConfig;
  /** Today's key, with today's full shape. A shell host sees no change. */
  persistedState?: PersistedStateConfig;
  /**
   * ADR-0003's shell shape: `releaseGraceMs`, `onUnmount` (`'release'` or
   * `'destroy'`), and, in 1.x only, `reuseInstance`.
   */
  lifecycle?: LifecycleConfig;
  /**
   * Today's `UploadConfig`: the SDK's fields plus `isOn`, which draws the attach button
   * in the prebuilt input and decides nothing else. `messaging.addFile` works whenever
   * `onFileUpload` is set, so a host with the button off can still attach files from
   * its own control.
   */
  upload?: UploadConfig;
  // ...every other field it has today
}

/**
 * The new instance parameters come after the existing ones and default to today's
 * types, so an existing `EventBusHandler<BusEventReceive>` or `TypeAndHandler`
 * annotation keeps its meaning.
 */
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

Checked under `tsc --strict`: every rule above holds, restating `on`, `off`, and `once` on `ChatInstance` compiles, and `ChatInstance` stays assignable to `ChatSDKInstance`.

### Reference: reading chat state

One read model serves both surfaces. `state` sits on `ChatSDKInstance`, and `ChatInstance` carries the same primitive over more state, so a prebuilt-chat host reads exactly as a composed chat does. The chat's own interface reads through that path too, so it can't rot while an SDK-only path stays healthy.

The layering runs one way. `ChatSDKState` is what a conversation has with no interface at all, and today's `PublicChatState` extends it with what the prebuilt chat keeps: view state, the home screen, the input, and the panels. A headless host reading `state.viewState` is a compile error, the same way a headless callback calling an interface member is.

Watching one value is one call, and the chat wakes your code only when that value changes. Reading gets cheaper for every host, because the chat builds public state only when something reads it, instead of rebuilding and deep-comparing the whole of it on every change.

```ts
instance.state.select(
  (state) => state.homeScreenState.isHomeScreenOpen,
  onHomeScreenChange
);

// A one-shot read
const state = instance.state.get();

// The conversation is read the same way
instance.state.select((s) => s.activeResponseId, onActiveResponseChange);
```

```ts
/**
 * Everything a conversation has to read, with no interface: the messages, how the turn
 * is going, the human-agent connection, and the pending uploads.
 *
 * @category SDK
 */
interface ChatSDKState {
  /**
   * Every message in the conversation, oldest first, including one still streaming.
   * Every message has an `id`: the chat assigns one when the backend, or your
   * `upsertMessage`, doesn't.
   */
  messages: readonly Message[];

  /**
   * `'loading'`, `'ready'`, `'submitted'` (sent, nothing back yet), `'streaming'`, or
   * `'error'`.
   *
   * `'loading'` while history and the welcome message load: after
   * `messaging.restartConversation()`, and on the prebuilt chat while its main window
   * loads them on first open. A handle from `createChatSDK` never reads it at boot,
   * because the promise resolves after loading. A send made during `'loading'` waits
   * for the load and then goes out, as today. Nothing rejects. Today's
   * `isHydratingCounter` on the prebuilt state is `@deprecated` in 1.x, naming this
   * value, and removed in 2.0.0.
   *
   * Becomes `'error'` when a send fails for good, or when history fails to load. The
   * next `send` moves it to `'submitted'`, so a host that disables its input only while
   * a turn is in flight lets the user try again. `messaging.restartConversation()`
   * sets it back to `'ready'`.
   */
  status: 'loading' | 'ready' | 'submitted' | 'streaming' | 'error';

  /**
   * The error behind `status: 'error'`, or `null`. The same value `onError` receives, so
   * a host learns one error shape. It gains an optional `messageID`, so a composed chat
   * can tell which message failed; a host reading `onError` today sees only a new
   * optional field. Cleared with `status`.
   */
  error: Readonly<ChatSDKErrorData> | null;

  /** Files attached to the next message, in the order they were added. */
  pendingUploads: readonly ChatSDKPendingUpload[];

  /**
   * True while any pending upload is still uploading. `send` rejects while it is.
   * Today's `input.hasInFlightUploads` on the prebuilt state is `@deprecated` in 1.x,
   * naming this field, and removed in 2.0.0, so one path reads it on both surfaces.
   */
  hasInFlightUploads: boolean;

  /** The human-agent connection, live: the saved fields plus `isConnecting`. */
  humanAgent: PublicChatHumanAgentState;

  /** The response a turn is currently filling, or `null` between turns. */
  activeResponseId: string | null;
}

/**
 * One file on its way into the next message. The chat already tracks this shape
 * internally; this publishes it.
 *
 * @category SDK
 */
interface ChatSDKPendingUpload {
  /** Generated by the chat. `messaging.addFile` resolves with it, `removeFile` takes it. */
  id: string;
  /** The file you passed to `messaging.addFile`. */
  file: File;
  status: 'uploading' | 'complete' | 'error';
  /** What your `onFileUpload` returned, once it resolves. */
  contributedData?: StructuredData;
  /** The message your `onFileUpload` threw, when `status` is `'error'`. */
  errorMessage?: string;
}

/**
 * What `onError` receives, and what `state.error` holds. Today's `OnErrorData` extends
 * it with `catastrophicErrorType`, which names the prebuilt chat's error panel and
 * means nothing without one. `OnErrorType` is shared; a headless chat never reports
 * `RENDER`.
 *
 * @category SDK
 */
interface ChatSDKErrorData {
  errorType: OnErrorType;
  message: string;
  otherData?: unknown;
  /** The message whose turn failed, when the error belongs to one. */
  messageID?: string;
}

/**
 * The one way to read chat state, on `instance.state`. `S` is how much state there is
 * to read: the SDK leaves it at {@link ChatSDKState}, and {@link ChatInstance} binds
 * it to `PublicChatState`.
 *
 * Reading is lazy. With no subscriber, no selector, and no `STATE_CHANGE` handler, the
 * chat builds no state object at all.
 *
 * `getState()` and the `STATE_CHANGE` event are `@deprecated` in 1.x, naming `get()`
 * and `select()`, and are removed in 2.0.0.
 *
 * @category SDK
 */
interface ChatSDKStateAccess<S extends ChatSDKState = ChatSDKState> {
  /**
   * Everything, right now. Built lazily and memoized per field: a field whose source
   * hasn't changed keeps its reference. So `() => chat.state.get().messages` is a stable
   * snapshot for React's `useSyncExternalStore`, and `React.memo` above one is safe.
   */
  get(): S;

  /** Runs the listener when any field changes. Returns the function that stops it. */
  subscribe(listener: () => void): () => void;

  /**
   * Runs the listener only when the selected value changes, so a field wakes just the
   * code that reads it. Compares with `Object.is` unless you pass `isEqual`, which is
   * what an object or array result usually wants.
   */
  select<T>(
    selector: (state: S) => T,
    listener: (value: T) => void,
    options?: { isEqual?: (a: T, b: T) => boolean }
  ): () => void;
}
```

### Reference: the React hook

```ts
/**
 * `createChatSDK` as a hook, from `@carbon/ai-chat/sdk/react`. Optional: a React host can
 * call `createChatSDK` itself, and everything the hook returns is reachable from the
 * handle. The hook creates the conversation on mount, releases it on unmount, and reads
 * state through `useSyncExternalStore`, so the component re-renders when `messages`,
 * `status`, or `error` changes, and not on any other change.
 *
 * The config is read on the first render, so an inline object is fine. To change it
 * later, call `chat.updateConfig`.
 *
 * Unmount calls `release()`, never `destroy()`. A route change that unmounts and
 * remounts the component picks the same conversation back up inside the grace window
 * ADR-0003 defines (3 seconds by default), and no human-agent conversation is cut. A
 * component that unmounts before boot finishes releases its claim once boot finishes.
 * A component that mounts on the same namespace in the meantime takes over that boot
 * instead of starting a second one, so React's development double-mount creates one
 * conversation and rejects nothing. The hook has no `onUnmount` option: a flow that must
 * start fresh, such as logout, calls `chat.destroy()` itself.
 *
 * If `createChatSDK` rejects, the hook re-renders the component and throws the
 * rejection from `useChatSDK`, so the nearest error boundary catches it. `chat` stays
 * `null` and `sendMessage` keeps rejecting. Remounting the component retries, because
 * the config is read on mount.
 *
 * @category SDK
 */
declare function useChatSDK(config?: ChatSDKConfig): UseChatSDKResult;

/** @category SDK */
interface UseChatSDKResult {
  /** The handle, or `null` until `createChatSDK` resolves. */
  chat: ChatSDKHandle | null;
  /** `state.get().messages`, live. Empty until the chat is ready. */
  messages: readonly Message[];
  /**
   * `'loading'` until `createChatSDK` resolves, then `state.get().status`, live. One
   * field, so a form disabled on `status !== 'ready'` covers boot too.
   */
  status: ChatSDKState['status'];
  /** `state.get().error`, live. `null` until the chat is ready. */
  error: Readonly<ChatSDKErrorData> | null;
  /**
   * `chat.messaging.send`, with one identity for the life of the component, so it can go
   * straight into a prop or a dependency list. Rejects until the chat is ready.
   */
  sendMessage: ChatSDKInstanceMessaging['send'];
}

/**
 * `state.select` as a hook: reads one value and re-renders the component only when that
 * value changes. For everything `useChatSDK` doesn't return, such as `humanAgent` or
 * `pendingUploads`. Compares with `Object.is` unless you pass `isEqual`. Returns
 * `undefined` while `chat` is `null`, so read `chat` first when `T` can itself be
 * `undefined`. Takes any {@link ChatSDKInstance}, so the `instance` a callback receives
 * works here too.
 *
 * @category SDK
 */
declare function useChatSDKState<T>(
  chat: ChatSDKInstance | null,
  selector: (state: ChatSDKState) => T,
  options?: { isEqual?: (a: T, b: T) => boolean }
): T | undefined;
```

The entry point imports `react` and `@carbon/ai-chat/sdk`, and nothing else. `react` is already a required peer dependency, so a host installs nothing new. The hook renders nothing and knows nothing about `ChatContainer`: that component is the prebuilt chat, and this is the composed one.

No Lit wrapper is proposed. The element in Proposal is the whole of what a Lit host writes, and a reactive controller that packages it can come later without changing this record.

### Reference: the SDK writes no text

A composed chat gets facts, and writes the words itself. The conversation reports what happened through state and events; it never puts rendered copy into the transcript, so `ChatSDKConfig` takes no `locale` and no `strings`.

What a composed chat renders for itself:

| What happened | Where the SDK reports it |
| --- | --- |
| An agent joined, left, or ended the conversation | `state.get().humanAgent`, and the `human_agent:*` events |
| A turn was cancelled | `state.get().status` returns to `'ready'` |
| A send failed | `state.get().status` is `'error'`, and `state.get().error` carries `ChatSDKErrorData` |
| Connecting to a desk failed | The same error state, plus your service desk's own callbacks |

`ChatSDKErrorData.message` is written for a developer reading a console, not for a user, so a composed chat writes its own wording from the error's type.

The prebuilt chat is unchanged: it keeps its language pack and still writes those messages. Taking the ones it injects into the message list out again is [#1889](https://github.com/carbon-design-system/carbon-ai-chat/issues/1889)'s job, not this record's.

### Reference: saving the agent connection

**A chat you create with `createChatSDK` stores nothing on its own.** It reads and writes no `sessionStorage`, no `localStorage`, and no cookie. What survives a page reload is what you save through `humanAgentState`, and where you put it is yours. Set neither field and nothing survives: a reload starts a fresh conversation, and an agent conversation in flight isn't picked back up.

The storage belongs to the entry point, not to the conversation layer. The prebuilt chat boots that same layer and still keeps one object per namespace in `sessionStorage`, and setting `persistedState` still replaces that storage. So nothing changes for a host rendering `ChatContainer`, `ChatCustomElement`, or a web component. `readCarbonChatSession`, which reads that object before the chat boots, stays a prebuilt-chat utility and isn't exported from the SDK.

A remount is not a reload. ADR-0003 keeps a released chat running in memory for a grace window, so a remount inside that window needs no persistence at all. This is for coming back after the chat is gone.

`state.select((s) => s.humanAgent, save)` would save the same fields. What it misses is the clearing: `state` stops notifying when a chat is destroyed, and `onStateChange` reports the cleared value instead, so your copy doesn't bring a destroyed conversation back.

What each side saves:

| Item | Saved by |
| --- | --- |
| `humanAgentState`: `isConnected`, `isSuspended`, `responseUserProfile`, `responseUserProfiles`, `serviceDeskState` | The SDK |
| `viewState`, `homeScreenState`, `disclaimersAccepted`, `hasSentNonWelcomeMessage`, `showUnreadIndicator` | The prebuilt interface |
| `launcherIsExpanded`, `launcherShouldStartCallToActionCounterIfEnabled` | The prebuilt interface, until 2.0.0 removes them along with the built-in launcher |

```ts
/**
 * Saving is a pair. Store what `onStateChange` hands you, and hand the last value back
 * as `initialState` on the next boot. Clearing takes care of itself: `destroy()` reports
 * a cleared value, and `messaging.restartConversation()` reports the connection ended,
 * so a host that stores whatever it receives drops a dead connection with no special
 * case.
 *
 * `S` is what gets saved. The SDK binds it to the agent connection, and today's
 * `PersistedStateConfig` binds it to `PersistableState`, so a shell host writes what it
 * writes now. Today's type gains no type parameter of its own.
 *
 * @category SDK
 */
interface ChatSDKPersistedStateConfig<S> {
  initialState?: S;
  onStateChange?: (state: S) => void;
}

/**
 * Today's type, unchanged. Four of the five fields are the chat's own record of the
 * conversation; only `serviceDeskState` is your service desk's.
 *
 * `isConnecting` is not here. It's true only while a connection is being set up, and a
 * reload should come back connected or not at all, never still connecting.
 *
 * @category SDK
 */
interface PersistedHumanAgentState {
  /** Whether a human agent conversation was live. Restoring `true` is what makes the chat reconnect. */
  isConnected: boolean;
  /**
   * Whether the conversation was paused. While it's paused, the chat sends nothing to the
   * desk and shows nothing from it. Set through `serviceDesk.updateIsSuspended`.
   */
  isSuspended: boolean;
  /** The last agent to join. Your interface names them, because the SDK writes no text. */
  responseUserProfile?: ResponseUserProfile;
  /** Every agent seen in this conversation, by id, so an older message can still name its sender. */
  responseUserProfiles: Record<string, ResponseUserProfile>;
  /** Whatever your service desk saved. The chat never reads it, and hands it back on reconnect. */
  serviceDeskState?: unknown;
}

/**
 * Today's type, plus `isScreenSharing`: the same connection while it's live, which is
 * what `state.humanAgent` returns.
 *
 * @category SDK
 */
interface PublicChatHumanAgentState extends PersistedHumanAgentState {
  /** True while the chat is connecting. Never saved, so a reload never resumes it. */
  isConnecting: boolean;
  /**
   * True from the moment your `onScreenShareRequest` resolves `ACCEPTED` until the desk
   * ends the share or you call `serviceDesk.stopScreenShare()`. Never saved.
   */
  isScreenSharing: boolean;
}
```

### Reference: messaging and uploads

```ts
/** @category SDK */
interface ChatSDKInstanceMessaging {
  /**
   * Sends a message. Same signature and settlement as `instance.send` today.
   *
   * Rejects while `isReadonly` is set, or while `state.hasInFlightUploads` is true. The
   * files in `state.pendingUploads` go out with the message.
   */
  send(message: string | MessageRequest, options?: SendOptions): Promise<void>;

  /**
   * Attaches a file to the next message, running the same pipeline the prebuilt input
   * uses: it checks `upload.accept`, `maxFileSizeBytes`, and `maxFiles`, then calls your
   * `onFileUpload`. During a human-agent conversation it hands the file to the service
   * desk instead.
   *
   * Resolves with the file's id once the file is accepted and its upload starts, so the
   * id is available to `removeFile` while the upload runs. Rejects when there is no
   * `onFileUpload`, or when the file breaks a limit. Progress and failure show up in
   * `state.pendingUploads`.
   */
  addFile(file: File): Promise<{ id: string }>;

  /**
   * Aborts an upload in progress, or drops a finished one from the next message. An
   * unknown id does nothing.
   */
  removeFile(id: string): void;

  /**
   * Writes an assistant message into the conversation, and the only way to do it. Call
   * it again with the same `messageID` to change what you wrote, which is how a composed
   * chat streams: upsert the partial message as it grows, then upsert it `COMPLETE`.
   * Today's signature and rules, unchanged.
   */
  upsertMessage(
    messageID: string,
    state: MessageState,
    updater: UpsertMessageUpdater
  ): Promise<void>;

  // ...today's `removeMessages`, `clearConversation`, `insertHistory`, and
  // `restartConversation`, plus three verbs whose exact shape is settled in their own
  // issues: `stop()` ends a streaming response early, `regenerate()` asks for another
  // answer to the same turn, and a turn-failure verb lets a host mark a turn failed
  // when its stream dies after the send resolved. Living on `messaging` is what makes
  // all three part of the SDK surface.
}
```

Today's `ChatInstanceMessaging` extends this and keeps `addMessage` and `addMessageChunk`, unchanged for the hosts that call them and rebuilt over `upsertMessage`, so one path writes every message instead of three. The chunk shape, the queue that orders the chunks, and the `chunk:userDefinedResponse` event fired from it all belong to `addMessageChunk`, so none of the three reaches a composed chat.

Root `send` and `restartConversation` are deprecated in 1.x (`restartConversation` already is) and removed in 2.0.0.

```ts
/**
 * What a composed chat needs for uploads: the limits `messaging.addFile` enforces, and
 * the transfer itself. Setting `onFileUpload` is what turns uploads on. There is no
 * separate switch, because a composed chat draws its own attach control, or none.
 *
 * The chat writes no upload copy. A failed upload shows up as the `errorMessage` on its
 * `state.pendingUploads` entry, which is the message your `onFileUpload` threw. Your
 * interface says the rest.
 *
 * @category SDK
 */
interface ChatSDKUploadConfig {
  /** What the file picker accepts, in the format of the HTML `accept` attribute. */
  accept?: string;
  /** Files above this are rejected before `onFileUpload` runs. No limit when unset. */
  maxFileSizeBytes?: number;
  /** How many files one message can carry. No limit when unset. */
  maxFiles?: number;
  /**
   * Transfers one file and returns what it adds to the next message. Throw to reject
   * the file; your error's message becomes that entry's `errorMessage`. The signal
   * fires when the file is removed mid-upload, or the chat shuts down.
   */
  onFileUpload?: (
    file: File,
    abortSignal: AbortSignal
  ) => Promise<StructuredData>;
}
```

### Reference: human-agent conversations

```ts
/**
 * The session half of today's `ServiceDeskPublicConfig`, which now extends this and
 * keeps `skipConnectHumanAgentCard`, because there is no card to click without an
 * interface. Every field keeps today's meaning and default.
 *
 * @category SDK
 */
interface ChatSDKServiceDeskConfig {
  /** How long to wait for the desk to say whether any agents are available. */
  availabilityTimeoutSeconds?: number;
  /** How long to wait for an agent to join before the chat ends the request. No limit by default. */
  agentJoinTimeoutSeconds?: number;
  /** Whether a new boot reconnects to a live agent conversation. Defaults to true. */
  allowReconnect?: boolean;
  /**
   * Answers a service desk's request to share the user's screen, with your own consent
   * flow. Resolve `ACCEPTED`, `DECLINED`, or `CANCELLED`. A headless chat with no hook
   * answers `DECLINED`. The prebuilt chat draws its modal when this is unset, and calls
   * the hook instead when it is set.
   */
  onScreenShareRequest?: () => Promise<ScreenShareState>;
}

/** Today's type, which gains `startConversation` and `stopScreenShare`. @category SDK */
interface ChatInstanceServiceDeskActions {
  /**
   * Starts a human-agent conversation, from anywhere: a help button, your own response
   * type, or the connect card's button, which does exactly this.
   *
   * With no options, the chat starts one on its own behalf, so a host never has to make
   * its backend emit a `connect_to_agent` response first. Pass `messageID` to start from
   * a response already in the conversation, which is what the card does. Pass `payload`
   * to hand your service desk data of your own; it arrives as
   * `StartChatOptions.preStartChatPayload`, the same way the
   * `human_agent:pre:startChat` event supplies it, and that event still fires and can
   * still cancel the start.
   *
   * Rejects when no service desk is configured, when `messageID` names no such response,
   * or when a human-agent conversation is already active. The prebuilt chat shows its
   * connecting state with no card when a start came from code.
   * `serviceDesk.skipConnectHumanAgentCard` keeps working.
   */
  startConversation(options?: {
    messageID?: string;
    payload?: unknown;
  }): Promise<void>;

  /**
   * Ends a screen share the user accepted, from your own control. Does nothing when no
   * share is running. `state.humanAgent.isScreenSharing` is how you know.
   */
  stopScreenShare(): Promise<void>;

  // ...today's members: endConversation, updateIsSuspended
}
```

### Reference: events

```ts
/**
 * The 18 events a conversation fires without an interface, and the only ones
 * `ChatSDKInstance.on` accepts. Subscribing to any other event there is a compile
 * error. `ChatInstance` accepts every event, as today, so `feedback`, `state:change`,
 * and the rest of the interface events stay available to a prebuilt-chat host.
 *
 * `chunk:userDefinedResponse` is not here, because `addMessageChunk` isn't: it fires
 * from the chunk queue that verb feeds. `userDefinedResponse` is here, because an
 * `upsertMessage` carrying a user-defined item fires it. `chat:ready` is not here:
 * the SDK hydrates during boot, so the `createChatSDK` promise is the ready signal,
 * and a restart is already marked by `restartConversation` and `history:end`.
 *
 * Two payload fields carry prebuilt-chat values a composed chat can ignore. The `slot`
 * on `userDefinedResponse` names a web-component slot. The `source` on `pre:send` and
 * `send` never reads one of the prebuilt input's values on a headless chat.
 */
type ChatSDKEventType =
  // Messages
  | 'pre:send'
  | 'send'
  | 'pre:receive'
  | 'receive'
  | 'userDefinedResponse'
  | 'stopStreaming'
  // Lifecycle
  | 'history:begin'
  | 'history:end'
  | 'pre:restartConversation'
  | 'restartConversation'
  // Human agents
  | 'human_agent:pre:receive'
  | 'human_agent:receive'
  | 'human_agent:pre:send'
  | 'human_agent:send'
  | 'human_agent:pre:startChat'
  | 'human_agent:pre:endChat'
  | 'human_agent:endChat'
  | 'human_agent:areAnyAgentsOnline';
```

## Open questions

None.

## Decision

Not decided. Feedback by 2026-09-24 in the RFC discussion linked above.
