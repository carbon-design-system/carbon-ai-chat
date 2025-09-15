---
title: Migration steps - 0.5.1
---

# Upgrading from @carbon/ai-chat 0.4.0 to 0.5.1

Summary: tours feature removed, human agent events renamed for clarity, some ChatInstance methods changed, Chain of Thought feature changed, and custom element sizing behavior simplified with required className for React and consistent class-based approach for both React and Web Component versions.

## Breaking Changes

### Tours Feature Removed

The entire tours feature has been removed from the library.

**What's gone:**

- `ChatInstance.tours` and all its methods
- `SendOptions.skipTourCard`
- `PublicConfig.tourConfig`
- `PublicWebChatState.isTourActive`
- All tour events (`tour:start`, `tour:end`, `CALLED_START_TOUR`, etc.)
- `START_TOUR_METHOD` message source

### Human Agent Event Renaming

Agent related events have been renamed to be more explicit about human agents vs AI bots.

**Event renames:**

- All `AGENT_*` events → `HUMAN_AGENT_*` in BusEventType
- Examples: `AGENT_PRE_RECEIVE` → `HUMAN_AGENT_PRE_RECEIVE`, `AGENT_END_CHAT` → `HUMAN_AGENT_END_CHAT`

**ServiceDesk type changes:**

- `AgentsOnlineStatus` → `HumanAgentsOnlineStatus`
- `ServiceDeskCallback.agentJoined(profile: AgentProfile)` → `agentJoined(profile: ResponseUserProfile)`
- `ServiceDeskPublicConfig.skipConnectAgentCard` → `skipConnectHumanAgentCard`
- `EndChatInfo.endedByAgent` → `endedByHumanAgent`

**Migration steps:**

- Find/replace `AGENT_` with `HUMAN_AGENT_` in event listeners
- Update ServiceDesk config properties
- Update type imports

### ChatInstance Method Changes

**Method renames:**

- `updateAssistantInputFieldVisibility(isVisible)` -> `updateInputFieldVisibility(isVisible)`

**Method removals:**

- `agentEndConversation()` - use `instance.serviceDesk.endConversation()` instead
- `updateIsTypingCounter(direction)` - use `instance.updateIsLoadingCounter()` instead

### PublicConfig Changes

**Removed:**

- `cspNonce` - Widget no longer accepts CSP nonce via config as it is no longer needed

### Custom Element Sizing Changes

Both `ChatCustomElement` (React) and `cds-aichat-custom-element` (Web Component) now use a simplified class-based approach for show/hide behavior.

**Breaking changes:**

**React (`ChatCustomElement`):**

- `className` prop is now required (was optional)
- The className must define width and height for the chat when open
- Automatic "grow to parent container" behavior has been removed

**Web Component (`cds-aichat-custom-element`):**

- No longer captures and restores computed styles
- External CSS must define the element's size when visible
- Uses `cds-aichat--hidden` class for hide/show (same as React)

**Migration steps:**

**For React:**

1. Ensure all `ChatCustomElement` usages include a `className` prop
2. Define explicit width and height in your CSS class

**For Web Components:**

1. Ensure your CSS defines explicit dimensions for `cds-aichat-custom-element`
2. Remove any CSS that relied on the old computed style behavior

**CSS examples (works for both):**

```css
.my-chat-container {
  width: 500px;
  height: 600px;
  /* other positioning styles */
}

/* Or use logical properties (recommended for international support) */
.my-chat-container-logical {
  inline-size: 500px;
  block-size: 600px;
  /* other positioning styles */
}
```

**Benefits:**

- Eliminates complex computed style detection
- Works seamlessly with CSS animations and transitions
- Simpler, more predictable behavior
- Consistent behavior across React and Web Component versions
- Both components use the same `cds-aichat--hidden` class

## New Features

### Chain of Thought Changes

Chain of Thought was available in 0.4.0 but has moved location and gained streaming support.

**Changes:**

- Chain of Thought has moved from `GenericItemMessageOptions` to `MessageOptions`
- Now supports streaming via `partial_response.message_options.chain_of_thought`
- Only displays on the last message (behavior change)

**Usage:**
Add `chain_of_thought` to message `message_options` (moved from item level):

```typescript
const messageWithThinking = {
  id: "msg-123",
  output: { generic: [{ response_type: "text", text: "Here's my answer..." }] },
  message_options: {
    chain_of_thought: [
      {
        title: "Analyzing the question",
        tool_name: "reasoning",
        status: ChainOfThoughtStepStatus.SUCCESS,
        input: "User asked about...",
        response: "I need to consider...",
      },
      {
        title: "Searching knowledge base",
        tool_name: "search",
        status: ChainOfThoughtStepStatus.PROCESSING,
      },
    ],
  },
};
```

**Migration note:** If you were using Chain of Thought in 0.4.0, move it from the individual item's `message_options` to the top-level message `message_options`.

### Per-Message Identity Control

Customize message sender identity using `ResponseUserProfile`:

```typescript
import { UserType } from "@carbon/ai-chat";

const response = {
  id: "resp-123",
  output: {
    generic: [{ response_type: "text", text: "Hello from the legal bot!" }],
  },
  message_options: {
    response_user_profile: {
      id: "legal-bot",
      nickname: "Legal Assistant",
      user_type: UserType.BOT,
      profile_picture_url: "https://example.com/legal-bot-avatar.png",
    },
  },
};
```

**Options:**

- Use `UserType.WATSONX` for default bot styling with custom name
- Use `UserType.BOT` with `profile_picture_url` for custom avatars
- Use `instance.updateBotName()` and `instance.updateMainHeaderAvatar()` for global changes

## Migration Examples

### Chain of Thought Example

```tsx
import { ChainOfThoughtStep, ChainOfThoughtStepStatus } from "@carbon/ai-chat";

const responseWithThinking = {
  id: "thinking-response",
  output: {
    generic: [
      {
        response_type: "text",
        text: "Based on my analysis, I recommend...",
      },
    ],
  },
  message_options: {
    chain_of_thought: [
      {
        title: "Understanding the request",
        tool_name: "comprehension",
        status: ChainOfThoughtStepStatus.SUCCESS,
        input: "User wants to know about...",
        response: "I need to analyze multiple factors...",
      },
      {
        title: "Searching documentation",
        tool_name: "doc_search",
        status: ChainOfThoughtStepStatus.SUCCESS,
        input: "search query: user requirements",
        response: "Found 15 relevant documents...",
      },
    ] as ChainOfThoughtStep[],
  },
};

// instance.messaging.addMessage(responseWithThinking);
```

## Streaming Changes (addMessageChunk)

Currently, the message might silently throw if you pass in unsupported items (or items that have moved!), this is a bug that will be fixed in the next release.

For custom streaming implementations using `instance.messaging.addMessageChunk`:

### Changes

**Partial response payload:**

- v0.4.0: `partial_response.history` was merged into message history
- v0.5.0: Only `partial_response.message_options` is merged.

**Complete item handling:**

- v0.4.0: `complete_item` could create new message item
- v0.5.0: `complete_item` updates existing item in-place (prevents duplicates and component re-mounting)

### Requirements

1. Include `response_type` on first chunk for each item
2. Place text on item level (`partial_item.text`), not top level
3. Required IDs: `streaming_metadata.response_id` for message, `streaming_metadata.id` for each item
4. Final response ID must match `streaming_metadata.response_id` used during streaming

### Streaming Example

```typescript
// First chunk - must include response_type
instance.messaging.addMessageChunk({
  streaming_metadata: { response_id: "resp-123" },
  partial_item: {
    response_type: "text", // Required on first chunk
    streaming_metadata: { id: "item-1", cancellable: true },
    text: "Hello",
  },
});

// Follow-up chunks
instance.messaging.addMessageChunk({
  streaming_metadata: { response_id: "resp-123" },
  partial_item: {
    streaming_metadata: { id: "item-1" },
    text: " world",
  },
});

// Complete the item
instance.messaging.addMessageChunk({
  streaming_metadata: { response_id: "resp-123" },
  complete_item: {
    response_type: "text",
    streaming_metadata: { id: "item-1" },
    text: "Hello world!",
  },
});
```

### Chain of Thought Streaming

Stream chain of thought steps during message delivery:

```typescript
instance.messaging.addMessageChunk({
  streaming_metadata: { response_id: "resp-123" },
  partial_response: {
    message_options: {
      chain_of_thought: [
        {
          title: "Processing request",
          tool_name: "thinking",
          status: ChainOfThoughtStepStatus.PROCESSING,
        },
      ],
    },
  },
  partial_item: {
    response_type: "text",
    streaming_metadata: { id: "item-1" },
    text: "Let me think...",
  },
});
```

**Debug tip:** Enable `config.debug: true` to see streaming logs and catch errors early.
