---
title: Slots
---

## Overview

Render your own content in slots throughout the chat, including the chat footer, the space above the prompt line, and panel content.

## Writing to a slot

Write to slots as portals from your application, using frameworks such as [React](./React.md), [Angular](./Angular.md), Vue, or [web components](./WebComponent.md). For a list of the available slots, see {@link WriteableElementName | the slot list}. Access slots through {@link ChatInstance.writeableElements}.

Some slots are layout-specific: {@link WriteableElementName.PROMPT_LINE_ACTIONS_END | the prompt-line actions slot} renders only when the input uses the expanded layout ({@link InputConfig.expanded}), and the default (compact) layout hides any content written to it.

### Align rounded corners

Slotted content can use the `data-rounded` and `data-stacked` attributes to align with the chat's corner rounding, which is especially useful for footer actions, custom headers, or any content that integrates with the chat shell.

Example (footer slot):

```ts
import { WriteableElementName } from '@carbon/ai-chat';

const footer = instance.writeableElements[WriteableElementName.FOOTER_ELEMENT];
if (footer) {
  footer.innerHTML = `
    <div class="my-footer-actions" data-rounded="bottom" data-stacked>
      <button type="button">Cancel</button>
      <button type="button">Save</button>
    </div>
  `;
}
```

`data-rounded="bottom"` inherits the bottom corner rounding, and `data-stacked` stacks the buttons vertically. See [Rounded corners](./Layout.md#rounded-corners).

## Custom header (CUSTOM_HEADER)

Use {@link WriteableElementName.CUSTOM_HEADER} to replace the built-in chat header with your own. When you supply content for this slot the chat mounts no header of its own and your content fills the header area directly.

**React path** — pass a React element in `renderWriteableElements`:

```ts
import { ChatCustomElement, WriteableElementName } from '@carbon/ai-chat';

<ChatCustomElement
  {...config}
  renderWriteableElements={{
    [WriteableElementName.CUSTOM_HEADER]: <MyHeader />,
  }}
/>
```

**Web-component / WC path** — write to the host node in `onBeforeRender` (before the React tree renders, so there is no first-paint flash):

```ts
import { WriteableElementName } from '@carbon/ai-chat';

element.onBeforeRender = (instance) => {
  const node = instance.writeableElements[WriteableElementName.CUSTOM_HEADER];
  const header = document.createElement('div');
  header.setAttribute('role', 'banner');
  header.setAttribute('aria-label', 'Application header');
  header.textContent = 'My custom header';
  node.appendChild(header);
};
```

### What is ignored while a custom header is present

All {@link HeaderConfig} fields (`title`, `name`, `menuOptions`, `actions`, `minimizeButtonIconType`, `hideMinimizeButton`, `showRestartButton`, `showAiLabel`, `hideDefaultAiLabelContent`, `hasContentMaxWidth`) are ignored while `CUSTOM_HEADER` has content.

The one exception is {@link HeaderConfig.isOn}: setting `isOn: false` hides the header area **even when a custom header is present** — the host content disappears along with the framework header. Use this to remove the header area entirely in fully headless or embedded layouts.

### Writeable elements inside the built-in header

{@link WriteableElementName.HEADER_FIXED_ACTIONS_ELEMENT} lives inside the built-in header component and therefore does not render while a custom header is active.

{@link WriteableElementName.HEADER_BOTTOM_ELEMENT} and {@link WriteableElementName.HOME_SCREEN_HEADER_BOTTOM_ELEMENT} are unaffected — they are placed in `slot="header-after"`, below the header, not inside it.

## Custom prompt line (CUSTOM_PROMPT_LINE)

Supply content for {@link WriteableElementName.CUSTOM_PROMPT_LINE} to replace the built-in composer on both the home screen and the conversation. No extra flag is needed. React hosts pass content through `renderWriteableElements`. Web-component hosts use `slot="customPromptLine"` on a child of the chat element. They can also append content to the node in {@link ChatInstance.writeableElements}.

You can add or remove content at any time. Direct slot markup needs no lifecycle callback. For imperative writes, `onBeforeRender` lets you supply content before the first paint; that callback is optional. Removing the content restores the built-in composer and its draft. An untouched wrapper, whitespace, comments, or a React component that returns `null` keeps the fallback. Any host-supplied element counts as content, even an empty element.

Only {@link InputConfig.isVisible} applies to the custom composer, in both assistant and human-agent views. A visibility override stored for the active input takes precedence. The deprecated {@link ChatInstance.updateInputFieldVisibility} method sets the assistant input's override. Hiding the area keeps your content and draft intact. All other input config fields are ignored, including limits, disabled states, suggestions, actions, layout, and errors.

The two slots inside the built-in composer disappear with it: {@link WriteableElementName.PROMPT_LINE_ACTIONS_END} and {@link WriteableElementName.PROMPT_LINE_SEND_BUTTON_START}. {@link WriteableElementName.BEFORE_INPUT_ELEMENT}, {@link WriteableElementName.HOME_SCREEN_BEFORE_INPUT_ELEMENT}, and {@link WriteableElementName.AFTER_INPUT_ELEMENT} keep their usual placement.

Your application owns the controls and uploads. See [Replace the prompt line](./PromptLine.md#replace-the-prompt-line) for sending, focus, state, and API rules. Complete examples: [React](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/custom-prompt-line) and [web components](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/custom-prompt-line).

## Related

- [Custom panels](./CustomPanels.md) — render your own content in an overlay panel through {@link WriteableElementName.CUSTOM_PANEL_ELEMENT | the custom panel slot}.
- [Layout](./Layout.md) — corner-rounding tokens used by `data-rounded`.
- [Using with React](./React.md) — get the {@link ChatInstance} and render slots in a React app.
- [Using as a Web component](./WebComponent.md) — get the {@link ChatInstance} and render slots with the web component.
