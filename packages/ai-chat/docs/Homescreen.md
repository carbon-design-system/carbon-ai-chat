---
title: Home screen
---

## Overview

The home screen is an optional landing view that appears before the first message, and while many use it to offer sample prompts, it is also room to introduce your assistant. Configure the home screen through {@link PublicConfig.homescreen | homescreen} with a {@link HomeScreenConfig | home screen config} object. Enable it by setting {@link HomeScreenConfig.isOn | isOn}.

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

## Greeting and starters

Set a welcome message with {@link HomeScreenConfig.greeting | greeting}, and add conversation-starter buttons with {@link HomeScreenConfig.starters | starters}, a {@link HomeScreenStarterButtons} object. Each {@link HomeScreenStarterButton | button} has a {@link HomeScreenStarterButton.label | label} that is also sent as the user's message when the button is clicked, and an optional {@link HomeScreenStarterButton.isSelected | isSelected} renders it as already chosen.

## Custom content

To hide the default greeting and starters and supply your own markup instead, set {@link HomeScreenConfig.customContentOnly | customContentOnly} to `true`, then render your content into the home-screen slots: {@link WriteableElementName.HOME_SCREEN_HEADER_BOTTOM_ELEMENT | header bottom}, {@link WriteableElementName.HOME_SCREEN_AFTER_STARTERS_ELEMENT | after starters}, and {@link WriteableElementName.HOME_SCREEN_BEFORE_INPUT_ELEMENT | before input}, which are described in [Slots](./WriteableElements.md).

## Returning to the home screen

By default, users can navigate back to the home screen after sending a message, but setting {@link HomeScreenConfig.disableReturn | disableReturn} to `true` keeps them in the conversation once it starts.

## Related

- [Slots](./WriteableElements.md) — render your own content into the home-screen slots.
- [Layout](./Layout.md) — layout modes, sizing tokens, the floating layout, and corner rounding.
- [UI customization](./Customization.md) — the hub for tailoring the chat UI.
