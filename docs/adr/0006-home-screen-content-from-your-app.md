---
status: proposed
date: 2026-11-19
feedback-by: 2026-12-16
discussion:
epic: https://github.com/carbon-design-system/carbon-ai-chat/issues/1930
supersedes:
superseded-by:
---

# ADR-0006: Your app renders the home screen's content in 2.0.0

## Summary

**Problem.** The home screen has three ways to show content. The chat can draw a greeting and a row of starter buttons. A flag turns those off. Then you fill up to three slots, and two of them sit outside the home screen's own body. If you want more than a line of text and some buttons, you have to turn the built-in content off. Every built-in piece is also one more thing the chat must restyle, port, and keep accessible.

**Proposal.** In 2.0.0 your app renders everything between the header and the prompt line, into one slot. The home screen config keeps two settings: `isOn`, and a new `enableReturn`. The greeting, starter buttons, `customContentOnly`, `disableReturn`, and the three old home-screen slots are removed. Returning to the home screen after a conversation starts becomes opt-in. Nothing changes in 1.x. The upgrade guide carries the warning.

**Feedback wanted.**

- Do you use the built-in greeting or starters today? Would `input.starters`, which offers starter prompts in the prompt line, cover you? Or would you write your own home screen?
- Do you place content right under the header or right above the prompt line on the home screen? Can one slot that fills that whole area replace it?
- Does your backend or platform send the greeting and starters as config data? If so, what would help you turn that data into your own markup?

## Motivation

If you use the home screen, you hit these problems today.

**Three overlapping ways to fill one screen.** The greeting is a plain string. A starter is a label that the chat also sends as the user's message. Neither takes markup, links, images, or a value that differs from its label. If you need any of that, you set `customContentOnly: true`, a flag whose only job is to turn the other two off. Then you fill the slots. The docs teach both paths, and nothing says which one to pick.

**Slots that are not where they look.** Only one of the three home-screen slots is inside the home screen's body. The other two take over the conversation's own slots under the header and above the prompt line while the home screen is open. Content meant as one block ends up split across three places, with spacing you don't control.

**Two starter features with different shapes.** The prompt line already has its own starters, `input.starters`. Each item there can have an ID, a separate value to send, a description, and an avatar. The home screen's starters have only a label. You choose between two features that do almost the same thing.

**Return is on by default.** Turn on the home screen, and you also get a "Home screen" entry in the header's overflow menu once a conversation starts. If your home screen is a one-time intro, you have to know about `disableReturn` to remove it. Once the chat no longer knows what the home screen shows, it has no basis for adding a way back to it.

**Why now.** 1.x is moving the chat's shell from React to Lit, one screen at a time. Each built-in piece of the home screen has to be ported, restyled, and checked for accessibility. 2.0.0 is the release where a removal can land, with one upgrade guide to explain it.

## Proposal

What a React host writes in 2.0.0. `Chat` is 2.0.0's React component for the `cds-aichat` element, today's `ChatCustomElement`, per [ADR-0004](0004-component-styling-contract.md). `messaging.send` is 2.0.0's home for `instance.send`, per [ADR-0002](0002-headless-sdk.md).

```tsx
import { Chat, type ChatInstance, type PublicConfig } from '@carbon/ai-chat';
import ChatButton, {
  CHAT_BUTTON_KIND,
} from '@carbon/ai-chat-components/es/react/chat-button.js';
import { useState } from 'react';

const config: PublicConfig = {
  // Plus your messaging config.
  homescreen: { isOn: true, enableReturn: true }, // enableReturn defaults to false
};

const STARTERS = ['Track my order', 'Start a return'];

export function App() {
  const [instance, setInstance] = useState<ChatInstance>();

  return (
    <Chat
      {...config}
      className="my-chat" // Your CSS sizes the chat, as with ChatCustomElement today.
      onBeforeRender={setInstance}
      renderWriteableElements={{
        // Your app owns everything between the header and the prompt line.
        homeScreenContent: (
          <div className="my-home-screen">
            <h2>How can I help you today?</h2>
            {STARTERS.map((label) => (
              <ChatButton
                key={label}
                kind={CHAT_BUTTON_KIND.TERTIARY}
                isQuickAction
                // Any send closes the home screen, as a built-in starter did.
                onClick={() => instance?.messaging.send(label)}>
                {label}
              </ChatButton>
            ))}
          </div>
        ),
      }}
    />
  );
}
```

The chat keeps the header, the prompt line, and the home screen's open and close behavior. The prompt line shows below your content by default, and your existing input settings can hide or replace it. Your app decides what the screen says and does. `ChatButton` with these settings is the button the built-in starters used, so you keep their look if you want it. Any element works.

If plain starter prompts are all you need, you don't need the slot. `input.starters` lists prompts in the prompt line while it's empty and focused, and sends the one the user picks. It is not a drop-in copy of the home-screen buttons, because it shows only while the prompt line has focus.

### Reference: config

```ts
/**
 * Turns on the home screen: a landing view the chat shows before the first message.
 * The chat renders the header and the prompt line. Your app renders everything
 * between them, in the `homeScreenContent` slot.
 */
interface HomeScreenConfig {
  /**
   * Shows the home screen before the first message. Default `false`. Unchanged from 1.x.
   * Any send, from the prompt line or from your code, closes the home screen.
   */
  isOn?: boolean;

  /**
   * Lets the user go back to the home screen after a conversation starts. Default `false`.
   *
   * When `true` and `isOn` is `true`, the header's overflow menu has a "Home screen"
   * entry once a conversation exists. The home screen then shows a "Return to
   * conversation" button that goes back to it.
   *
   * When a config update turns this off while the home screen is open and messages
   * exist, the chat closes the home screen.
   */
  enableReturn?: boolean;
}
```

The last rule in that comment is new. Today, turning off return through a config update closes the home screen only when `isOn` changes in the same update.

`HomeScreenState` keeps its two fields, `isHomeScreenOpen` and `showBackToAssistant`, with their current behavior.

| Removed in 2.0.0 | What replaces it |
| --- | --- |
| `greeting` | Your heading or text in `homeScreenContent` |
| `starters`, and the `HomeScreenStarterButtons` and `HomeScreenStarterButton` types | Your buttons in `homeScreenContent`, sending through `messaging.send`. Or `input.starters` in the prompt line |
| `customContentOnly` | Nothing. The chat always behaves as if it were `true` |
| `disableReturn` | `enableReturn`, with the opposite meaning and the opposite default. No alias |

### Reference: one slot

`WriteableElementName.HOME_SCREEN_CONTENT`, with the slot name `homeScreenContent`, replaces all three home-screen slots. The name follows the newer slot names without an `_ELEMENT` suffix, such as `PROMPT_LINE_ACTIONS_END`.

| While the home screen is open, from top to bottom | Owner |
| --- | --- |
| Header | The chat, or your `customHeader` content |
| `homeScreenContent` | Your app. It spans the full width and height between the header and the prompt line, so your CSS can place content at the top, center, or bottom. It scrolls when content is taller. With no content, the area is empty |
| Prompt line | The chat, shown by default. `input.isVisible: false` hides it, on the home screen and in the conversation alike. `customPromptLine` content replaces it on both |
| The slot below the prompt line, and the footer slot | Your app, as today. They show on both screens |

The conversation's slots under the header and above the prompt line stay hidden while the home screen is open, as they are today. The chat keeps a labeled dialog region around the slot for screen readers. Your content owns its headings, focus order, contrast, and motion. The built-in starter animation goes away with the built-in starters.

The three old slot names get no alias and no runtime warning:

| Retired enum member | Retired `slot=` value | Where the content goes |
| --- | --- | --- |
| `HOME_SCREEN_HEADER_BOTTOM_ELEMENT` | `homeScreenHeaderBottomElement` | The top of `homeScreenContent` |
| `HOME_SCREEN_AFTER_STARTERS_ELEMENT` | `homeScreenAfterStartersElement` | `homeScreenContent` |
| `HOME_SCREEN_BEFORE_INPUT_ELEMENT` | `homeScreenBeforeInputElement` | The bottom of `homeScreenContent` |

Each kept name would need its own position in the layout, which brings back the split this proposal removes. The upgrade guide carries the warning instead.

### Reference: release plan

| Release | Change |
| --- | --- |
| 1.x | Nothing. No new setting, no new slot, and no deprecation tags. The home screen works as it does today |
| 2.0.0 | Add `enableReturn` and `homeScreenContent`. Remove `greeting`, `starters`, `customContentOnly`, `disableReturn`, the two starter types, and the three old slots. The chat stops drawing a greeting and starter buttons. Each removal gets a `BREAKING CHANGE` entry and an upgrade-guide entry |

The usual rule is that a 2.0.0 removal is deprecated in 1.x first, with its replacement there. This proposal is an exception. The replacements arrive only in 2.0.0, so a 1.x deprecation would give you nothing to act on.

## Consumer impact

Several of these breaks don't show up in your build. They show up as a UI that's quietly different. They come first.

### Your home screen goes blank

A config built as a typed object literal fails to compile on `greeting` and `starters`. Config that comes from JSON, a backend, a plain JavaScript object, or the web component's `config` property doesn't. The home screen opens with a header, an empty middle, and a prompt line, and nothing logs an error.

```ts
// Before (1.x)
const config = {
  homescreen: {
    isOn: true,
    greeting: 'How can I help you today?',
    starters: { isOn: true, buttons: [{ label: 'Track my order' }] },
  },
};
```

```html
<!-- After (2.0.0) -->
<cds-aichat class="my-chat">
  <div slot="homeScreenContent" class="my-home-screen">
    <h2>How can I help you today?</h2>
    <cds-aichat-button kind="tertiary" is-quick-action
      >Track my order</cds-aichat-button
    >
    <cds-aichat-button kind="tertiary" is-quick-action
      >Start a return</cds-aichat-button
    >
  </div>
</cds-aichat>

<script type="module">
  // Load the chat and button elements first, the same way you load the chat today.
  const chat = document.querySelector('cds-aichat');
  const home = chat.querySelector('[slot="homeScreenContent"]');

  chat.onBeforeRender = (instance) => {
    // One listener covers every starter button.
    home.addEventListener('click', (event) => {
      const button = event.target.closest('cds-aichat-button');
      if (button) instance.messaging.send(button.textContent.trim());
    });
  };
  chat.config = { homescreen: { isOn: true } }; // Plus your messaging config.
</script>
```

### The "Home screen" menu entry disappears

Return flips from on by default to off by default. A typed object literal fails to compile on `disableReturn`. Loosely typed config doesn't, and the overflow menu silently loses its "Home screen" entry.

| 1.x setting                        | 2.0.0 setting with the same behavior |
| ---------------------------------- | ------------------------------------ |
| `disableReturn: true`              | Omit `enableReturn`                  |
| `disableReturn: false`, or omitted | `enableReturn: true`                 |

### Content in the old slots renders nothing

A `slot=` value the chat doesn't know renders nothing, with no error. In React, an object literal passed to `renderWriteableElements` fails to compile on the old keys. Markup, and objects built elsewhere, don't.

```html
<!-- Before (1.x): three slots in three places -->
<div slot="homeScreenHeaderBottomElement">Intro banner</div>
<div slot="homeScreenAfterStartersElement">Featured links</div>
<div slot="homeScreenBeforeInputElement">Privacy notice</div>
```

```html
<!-- After (2.0.0): one slot. Your CSS places each part. -->
<div slot="homeScreenContent" class="my-home-screen">
  <div>Intro banner</div>
  <div>Featured links</div>
  <div class="my-home-screen__bottom">Privacy notice</div>
</div>
```

```css
.my-home-screen {
  display: flex;
  flex-direction: column;
  min-block-size: 100%;
}

.my-home-screen__bottom {
  margin-block-start: auto;
}
```

### Starter clicks lose their send source

A built-in starter sent with the home-screen-starter source. The send events and your `customSendMessage` handler both see it. A send from your own button carries the source for programmatic sends instead. If your analytics or your backend branch on the starter source, tag starter sends yourself, for example in the message's structured data. The 2.0.0 work on send events decides what happens to the unused source value.

### Compile errors

TypeScript code that sets `customContentOnly`, or imports `HomeScreenStarterButtons` or `HomeScreenStarterButton`, fails to compile. Delete those lines. `customContentOnly: true` changes nothing in 2.0.0, because that is the only behavior.

## Drawbacks

- **The easy path costs more code.** A greeting and three starters took one config object. Now it takes markup, styles, and a click handler that reaches the instance.
- **`input.starters` is not a light substitute.** It turns on the rich prompt line, which loads the Tiptap editor. If you used home-screen starters to avoid that, writing your own buttons is the lighter path.
- **The docs must carry an accessible example.** You now write the home screen's content, so the upgrade guide needs one with correct headings and focus order to copy.

## Open questions

None.

## Decision

Not decided. Feedback by 2026-12-16 in the RFC discussion linked above.
