---
title: UI customization
children:
  - ./Theming.md
  - ./Layout.md
  - ./Launcher.md
  - ./Header.md
  - ./PromptLine.md
  - ./Homescreen.md
  - ./WriteableElements.md
  - ./CustomPanels.md
  - ./Responses.md
  - ./CustomMessageFooter.md
---

## Overview

Customize the chat UI at three levels, from quickest to deepest:

- **Configure** — set behavior and appearance through {@link PublicConfig | config} props.
- **Restyle** — inherit or inject a Carbon theme and override the chat's CSS custom-property tokens for color, sizing, and placement.
- **Inject your own content** — render your own markup into slots, overlay panels, message responses, and footers.

The inject-your-own-content areas render through your framework using the {@link ChatInstance | chat instance}. Their APIs differ between [React](./React.md) and the [web component](./WebComponent.md). Be sure to refer to the documentation for your framework for implementation differences.

Pick the area you want to customize:

- [Theming](./Theming.md) — inherit or inject a Carbon theme and override colors.
- [Layout](./Layout.md) — layout modes, sizing and placement CSS custom properties, the floating layout, and corner rounding.
- [Launcher](./Launcher.md) — configure or replace the launcher and style its tokens.
- [Header](./Header.md) — title, buttons, menus, and the AI label in the header bar.
- [Prompt line](./PromptLine.md) — visibility, suggestions, custom actions, file uploads, and editor extensions in the message input.
- [Home screen](./Homescreen.md) — the optional landing view with greeting and starter prompts.
- [Slots](./WriteableElements.md) — write your own content into slots around the chat.
- [Custom panels](./CustomPanels.md) — open an overlay panel with your own content.
- [Customizing responses](./Responses.md) — style rich text responses and render your own {@link MessageResponseTypes.USER_DEFINED | user-defined} content.
- [Custom message footer](./CustomMessageFooter.md) — render your own content beneath an assistant message.

## Config reference

See {@link PublicConfig | config} for other options like the assistant name or feedback persistence.
