---
title: Home screen
---

### Overview

The home screen is an optional landing view shown before the first message. Many use it to offer sample prompts, but it is also room to introduce your assistant. Configure it through {@link PublicConfig.homescreen} with a {@link HomeScreenConfig}, and enable it with {@link HomeScreenConfig.isOn}.

```ts
import type { PublicConfig } from "@carbon/ai-chat";

const config: PublicConfig = {
  homescreen: {
    isOn: true,
    greeting: "How can I help you today?",
    starters: {
      isOn: true,
      buttons: [{ label: "Track my order" }, { label: "Start a return" }],
    },
  },
};
```

### Greeting and starters

Set a welcome message with {@link HomeScreenConfig.greeting}. Add conversation-starter buttons with {@link HomeScreenConfig.starters} (a {@link HomeScreenStarterButtons} object). Each {@link HomeScreenStarterButton} has a {@link HomeScreenStarterButton.label} that is also sent as the user's message when clicked, and an optional {@link HomeScreenStarterButton.isSelected} to render it as already chosen.

### Custom content

To hide the default greeting and starters and supply your own markup instead, set {@link HomeScreenConfig.customContentOnly} to `true` and render into the home-screen slots ({@link WriteableElementName.HOME_SCREEN_HEADER_BOTTOM_ELEMENT}, {@link WriteableElementName.HOME_SCREEN_AFTER_STARTERS_ELEMENT}, {@link WriteableElementName.HOME_SCREEN_BEFORE_INPUT_ELEMENT}) — see [Slots](./WriteableElements.md).

### Returning to the home screen

By default users can reopen the home screen after sending a message. Set {@link HomeScreenConfig.disableReturn} to `true` to keep them in the conversation once it starts.

### Related

- [Slots](./WriteableElements.md) — render your own content into the home-screen slots.
- [Layout](./Layout.md) — layout modes, sizing tokens, the floating layout, and corner rounding.
- [UI customization](./Customization.md) — the hub for tailoring the chat UI.
