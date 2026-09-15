---
status: proposed
date: 2026-09-15
feedback-by: 2026-09-17
discussion:
epic: https://github.com/carbon-design-system/carbon-ai-chat/issues/1728
supersedes:
superseded-by:
---

# ADR-0003: A chat survives being unmounted and mounted again

## Summary

**Problem.** When your app unmounts the chat and mounts it again, the chat starts over. The transcript disappears, a live human-agent conversation can end, and the old chat keeps running in the background. Ordinary app code triggers this: React's development double mount, a changed `key`, a conditional render, a route change.

**Proposal.** Keep the conversation alive across a remount. Unmounting releases the chat, and it stays alive for a short grace window, 3 seconds by default. Mounting the same namespace again inside that window picks up the running conversation. In 1.x you opt in with `lifecycle.reuseInstance`. In 2.0 it's how the chat always works, and `lifecycle.onUnmount: 'destroy'` is how you get a fresh chat instead.

**Feedback wanted.**

- Does your app ever mount two chats with the same namespace at once, for example during an exit animation? That becomes an error.
- Do you reset the chat by remounting it, for example on logout? In 2.0 that keeps the conversation unless you set `lifecycle.onUnmount: 'destroy'`.
- How long can your app go between unmounting the chat and mounting it again, for example while a route loads? The window is 3 seconds by default.

## Motivation

A chat belongs to the component mount that created it. Every mount builds a new chat, and unmounting doesn't shut the old one down. Its subscriptions and in-flight requests keep running with nothing left to use them.

What a remount loses:

- **The transcript.** Messages aren't saved to browser storage, so the new chat starts empty unless your `customLoadHistory` restores it.
- **A human-agent conversation.** The new chat sees that an agent was connected. If the service desk can reconnect, it tries. If it can't, or reconnecting is turned off, the new chat drops the conversation, and adds a "chat was ended" message if your history loader restored the transcript. The old chat still holds the connection.
- **Nothing tells you.** Your app never sees a lifecycle event. It re-rendered, and the user lost the conversation.

Plain framework code causes this: React StrictMode mounting twice in development, a `key` that changes, a chat rendered behind a condition, a layout that moves the chat between routes. `ChatContainer` guards some remounts that start inside it, and nothing above it.

The headless SDK in [ADR-0002](0002-headless-sdk.md) needs a lifetime model too. With no component to unmount, the host has to say when it's done. This proposal gives both the shells and the SDK the same one.

Surviving a full page reload is out of scope. The transcript isn't written to browser storage, so after a reload only your history loader can bring it back.

## Proposal

```tsx
// 1.x: opt in
<ChatContainer
  namespace="support"
  lifecycle={{ reuseInstance: true }}
  messaging={{ customSendMessage }}
/>

// 2.0: reuse is how it works. Opt out where a remount must start fresh.
<ChatContainer
  namespace="support"
  lifecycle={{ onUnmount: 'destroy' }}
  messaging={{ customSendMessage }}
/>
```

```ts
// The SDK, from ADR-0002
const chat = await createChatSDK({ namespace: 'support', messaging });

chat.release(); // done for now: the conversation stays alive for the grace window
chat.destroy(); // done for good: the conversation ends now
```

A chat is identified by its namespace. Unmounting, or calling `release()`, drops your claim on it. When the last claim drops, a grace window opens. Mount or create the same namespace inside the window and you get the running conversation back. Let the window run out and the chat shuts down.

Your code doesn't learn whether it got a new conversation or a running one. If you seed a welcome message once, ask the conversation instead:

```ts
if (instance.state.messages.get().length === 0) {
  seedWelcome();
}
```

### Reference: claims and the grace window

- **A registry holds one running chat per namespace.** A chat with no namespace uses the empty namespace, so it reuses like any other.
- **Each mount, and each `createChatSDK` call, takes a claim when it starts**, before the chat finishes booting, and gets its own handle. On the SDK, the handle is the claim.
- **A mount or create adopts the running chat only while that chat is in its grace window.** It gets a fresh handle and cancels the shutdown. If the chat is still booting, adopting waits for boot to finish.
- **A mount or create on a namespace with a live claim fails.** `createChatSDK` rejects. A shell doesn't render the chat, and reports the error through `onError` and the console. The error names the namespace and says to give each chat its own.
- **Adopting applies the new config as a replacement**, like `updateConfig` in ADR-0002. A field the new config leaves out returns to its default. One exception, also from ADR-0002: a new `serviceDeskFactory` waits until no human-agent conversation is active, so a factory recreated by the new mount doesn't cut one.
- **`release()` drops this handle's claim.** Calling it again does nothing. When no claims remain, the grace window opens.
- **The window lasts `lifecycle.releaseGraceMs` milliseconds**, 3000 by default. When it runs out, the chat shuts down. If boot is still running when it runs out, the chat shuts down as soon as boot finishes.

### Reference: shutting down

A chat shuts down in one of two ways: `destroy()`, meaning done for good, or the grace window running out, meaning nobody came back in time.

|  | `destroy()` | Window runs out |
| --- | --- | --- |
| In-flight requests and subscriptions | Cancelled | Cancelled |
| A live human-agent conversation | Ended, the same way `messaging.restartConversation()` ends one | Disconnected, not ended |
| Saved session state for the namespace | Cleared | Kept |

- **`destroy()` starts shutdown now, whatever other claims exist.** Nothing can adopt the chat afterward. Event handlers see the end-of-chat events, but can't cancel the shutdown.
- **When the window runs out, a later mount picks up where today's remount does.** The saved session state still says an agent was connected, so the new chat tries to reconnect, exactly as a remount does today.
- **Saved session state** covers view state, accepted disclaimers, and human-agent profiles and connection state. Neither kind of shutdown touches state your app stores itself through `persistedState`.
- **Shutdown finishes asynchronously.** A mount or create on the same namespace waits until it's done, so the old chat can't overwrite the new one's session state.
- **Other handles to a destroyed chat stop working.** Methods that return a promise reject, and the rest do nothing. Their stores keep their last value and stop notifying.

### Reference: the shells

- **Unmounting `ChatContainer` or `ChatCustomElement`, or disconnecting a web component, releases its claim.**
- **`lifecycle.onUnmount` chooses what unmounting does:** `'release'`, the default, or `'destroy'`. Use `'destroy'` for flows where a remount must start fresh, such as logout. A web component takes it through its `lifecycle` property, or as a JSON `lifecycle` attribute.
- **Moving a web component to another place in the page keeps the conversation going.** Disconnecting and reconnecting is a release followed by an adopt.

### Reference: timing

- **1.x.** `lifecycle.reuseInstance` defaults to `false`. A shell with it off doesn't use the registry at all: every mount builds a new chat, and it never collides with a claim. Unmounting it shuts the chat down at once, the way the window running out does. Requests are cancelled and an agent conversation is disconnected, not ended, and saved session state is kept. Users see what they see today, but the old chat no longer keeps running in the background. `lifecycle.onUnmount` ships with the flag and only matters when it's on. `lifecycle.reuseInstance` isn't deprecated in 1.x, because setting it opts into 2.0's behavior early. An experimental SDK release in 1.x always reuses, with no flag, because it has no existing hosts to protect.
- **2.0.0.** `lifecycle.reuseInstance` is removed, and reuse is how every chat works. A config that still sets it fails to compile. `lifecycle.releaseGraceMs` and `lifecycle.onUnmount` stay. `release()` and `destroy()` always differ wherever they exist.

### Reference: config

```ts
// On ChatSDKConfig, so the SDK and the shells both take it
lifecycle?: {
  /** How long a released chat waits to be adopted before it shuts down. Defaults to 3000. */
  releaseGraceMs?: number;
};

// On PublicConfig, the shells' config
lifecycle?: {
  releaseGraceMs?: number;
  /** What unmounting does. Defaults to 'release'. */
  onUnmount?: 'release' | 'destroy';
  /** 1.x only; removed in 2.0.0. Keep the conversation alive across a remount. Defaults to false. */
  reuseInstance?: boolean;
};
```

## Consumer impact

**The silent break is in 2.0: a remount no longer resets the chat.** If you start a fresh conversation by remounting, whether by changing `key`, toggling a condition, or unmounting on logout and mounting on login, your code still compiles. The new mount then picks up the old conversation, including another user's transcript. A `key` change remounts at once, so it always lands inside the window. Set `lifecycle.onUnmount: 'destroy'` wherever a remount must start fresh:

```tsx
// Before (1.x): a new user gets a new chat
function SupportChat({ user }) {
  return user ? (
    <ChatContainer key={user.id} namespace="support" {...config} />
  ) : null;
}

// After (2.0): same result
function SupportChat({ user }) {
  return user ? (
    <ChatContainer
      key={user.id}
      namespace="support"
      lifecycle={{ onUnmount: 'destroy' }}
      {...config}
    />
  ) : null;
}
```

Destroying on unmount also clears the saved session state, so the next user doesn't inherit the last one's accepted disclaimers or agent profiles. To start over while the chat stays mounted, call `instance.messaging.restartConversation()`. Don't put a user ID in the namespace: it's part of the chat's accessible region label, and screen readers read it aloud.

**Leaving the chat for longer than the window behaves like a remount does today.** The released chat disconnects from any agent conversation, and the next mount tries to reconnect.

**Two chats on screen with the same namespace now fail to render, in 1.x with the flag on and always in 2.0.** That includes two chats with no namespace. Today they silently share element IDs and session storage. Give each one its own namespace. Watch for a chat that stays mounted during an exit animation while its replacement mounts: that's two live claims at once.

**In 1.x without `lifecycle.reuseInstance: true`, one thing changes: an unmounted chat stops running.** Today it keeps its requests and subscriptions alive with nothing using them. What your users see stays the same, because the next mount still starts fresh and reconnects to an agent.

**If you move from 1.x to 2.0 with the flag set,** your build fails on `lifecycle.reuseInstance`. Delete it. Everything else stays.

## Drawbacks

- **A released chat keeps running for the grace window.** Requests, a human-agent connection, and a response still streaming outlive the unmount by up to 3 seconds. That's what a remount adopts, but a host that unmounted on purpose pays for it unless it sets `lifecycle.onUnmount: 'destroy'`.
- **A conversation left past the window stays open on the service desk.** The chat disconnects without ending it, as a remount does today. A service desk that can't reconnect leaves an agent waiting until its own timeout.
- **The namespace becomes the chat's identity.** Two parts of an app that picked the same namespace, or none, now collide instead of quietly running side by side. And the namespace can't carry a user ID, because screen readers read it.
- **The registry lives in module state.** Two copies of the package on one page don't share it, and reuse fails between them without any warning.
- **Exit animations can trip the error.** A framework that keeps the old chat mounted while the new one mounts creates two live claims, even though the user only sees one chat.
- **The two shutdowns differ in what they leave behind.** A host has to know that `destroy()` clears saved session state and ends agent conversations, and that the window running out does neither.

## Alternatives

- **Start fresh on every mount, as today.** It costs nothing and breaks nobody. It lost because it makes ordinary framework code destroy conversations. The only fix it offers is a rule to mount once and never move the chat, which the framework can't enforce.
- **Reuse on by default in 1.x, with no flag.** It's simpler, and it gets everyone the good behavior sooner. It lost because it silently changes lifetime rules under hosts that already ship and may rely on a remount clearing the chat. That change belongs in a major.
- **Keep the flag after 2.0, as an opt-out.** It lets hosts keep today's behavior. It lost because, with reuse off, `release()` and `destroy()` do the same thing, so code written against one flag value changes meaning when the flag flips. `lifecycle.onUnmount: 'destroy'` gives the opt-out without that ambiguity.
- **Let a second live mount share the running chat.** It would let two views show one conversation. It lost because the two mounts would fight over one config: each one's props replace the other's whenever either re-renders.
- **An `adopted` flag on what create returns.** It lets a host skip setup it already ran. It lost because an early prototype got it wrong: a mount released during boot left the next one told "adopted" when setup had never finished. A question about the conversation, like the `messages` check above, is true whenever you ask it.
- **No grace timer: a released chat lives until `destroy()` or page unload.** It's the simplest rule. It lost because a host that never calls `destroy()` leaks a running chat, and a human-agent connection with it, for the life of the page.

## Open questions

None.

## Decision

Not decided. Feedback by 2026-09-17 in the RFC discussion linked above.
