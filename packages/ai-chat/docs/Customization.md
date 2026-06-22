---
title: UI customization
children:
  - ./Theming.md
  - ./Layout.md
  - ./Launcher.md
  - ./Header.md
  - ./Homescreen.md
  - ./WriteableElements.md
  - ./CustomPanels.md
  - ./Responses.md
  - ./CustomMessageFooter.md
---

### Overview

Customize the chat UI at three levels, from quickest to deepest:

- **Configure** — set behavior and appearance declaratively through {@link PublicConfig} props.
- **Restyle** — inherit or inject a Carbon theme and override the chat's CSS custom-property tokens for color, sizing, and placement.
- **Inject your own content** — render your own markup into slots, overlay panels, message responses, and footers.

The inject-your-own-content areas render through your framework, so they need the {@link ChatInstance} and the APIs differ between [React](./React.md) and the [web component](./WebComponent.md).

Pick the area you want to customize:

- [Theming](./Theming.md) — inherit or inject a Carbon theme and override colors.
- [Layout](./Layout.md) — layout modes, sizing and placement CSS custom properties, the floating layout, and corner rounding.
- [Launcher](./Launcher.md) — configure or replace the launcher and style its tokens.
- [Header](./Header.md) — title, buttons, menus, and the AI label in the header bar.
- [Home screen](./Homescreen.md) — the optional landing view with greeting and starter prompts.
- [Slots](./WriteableElements.md) — write your own content into slots around the chat.
- [Custom panels](./CustomPanels.md) — open an overlay panel with your own content.
- [Customizing responses](./Responses.md) — style rich text responses and render your own {@link MessageResponseTypes.USER_DEFINED} content.
- [Custom message footer](./CustomMessageFooter.md) — render your own content beneath an assistant message.

### Config reference

To configure other options like the assistant name or feedback persistence, see {@link PublicConfig}.
