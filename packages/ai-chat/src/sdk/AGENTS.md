# `src/sdk/` — the headless engine

Everything a chat needs to run without a view: the store, services, messaging, events, schema, and utils. `createChatSDK` boots it, and the prebuilt chat boots through it too.

## What's public

- **Only `index.ts` is public**, and only from 2.x. It's the future `@carbon/ai-chat/sdk` entry that [ADR-0002](../../../../docs/adr/0002-headless-sdk.md) describes. No package entry point exports it in 1.x.
- **Everything else here is internal**, even when `chat/` imports it. Export a new SDK type or verb through `index.ts`, and expect [the SDK surface snapshot](../../tests/architecture/spec/sdkSurface_spec.ts) to show it in review.

## Parts that serve only the prebuilt chat

These aren't SDK features. They live here because they must outlive a mount, or because conversation code writes them:

- The localized messages the chat adds to the transcript, read from [src/languages/](../languages/). #1889 owns taking those out.
- `UserSessionStorageService`. ADR-0002 gives storage to the entry point, not the conversation.
- The view ports: `services/viewBindings.ts` and `services/messaging/presentationPort.ts`.
- `services/slotTracking.ts`, plus `ServiceManager`'s slot and announcer services.
- The seams the view partition uses: `store/attachStorePartition.ts`, `store/conversationActions.ts`, and `store/extendPublicState.ts`. Never export them through `index.ts`.
- `utils/messageMetadataCommands.ts`, the prebuilt chat's two metadata write routes.

Keep a new prebuilt-only part in `chat/` unless it has one of those two reasons.

## Ports or reactions

Conversation code reaches the UI in one of two ways:

- **Through a port**, for ordered effects, announcements, and questions only the view can answer. Ask through `ViewBindings`, and handle a missing view.
- **Through a reaction**, for view state that follows a conversation fact. The view partition's reducer in `chat/state/` reacts to the conversation actions in the same dispatch.

The home screen closes both ways today: the presentation port's `closeHomeScreen`, and the reducer's reaction to a shown local item.

## The rule

`sdk/` imports only `sdk/` and `types/`, and nothing it reaches may import React, Lit, or a module that registers a custom element. [The boundary spec](../../tests/architecture/spec/sourceBoundaries_spec.ts) checks it, through type-only imports too. A future `src/sdk/react/` needs its own rule there; the check applies the most specific folder's rule.

## Related guidance

- [Read when changing message flows or the presentation port](services/messaging/AGENTS.md).
- [Read when changing store actions or state](store/AGENTS.md).
