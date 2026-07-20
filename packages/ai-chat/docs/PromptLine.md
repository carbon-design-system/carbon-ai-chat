---
title: Prompt line
---

## Overview

The prompt line is the input area at the bottom of the chat. The user writes and sends messages there. You set it up with {@link PublicConfig.input} and an {@link InputConfig}. The same setup drives the input on the [home screen](./Homescreen.md).

```ts
import type { PublicConfig } from "@carbon/ai-chat";

const config: PublicConfig = {
  input: {
    maxInputCharacters: 4000,
    starters: [{ id: "status", label: "What's my order status?" }],
  },
};
```

> **Note**: Only a few parts are stable. These are visibility, the disabled states, and the character limit. The rest of the prompt line is experimental and may change. Experimental members carry a badge in the API reference.

## Visibility, disabled states, and errors

Hide the input with {@link InputConfig.isVisible | isVisible}. Make it read-only with {@link InputConfig.isDisabled | isDisabled}. That is the narrow form of {@link PublicConfig.isReadonly | isReadonly}, which freezes the whole chat. {@link InputConfig.isSendDisabled | isSendDisabled} gates only the send button and the Enter key. The editor stays editable. A {@link ChatInstance.send | send} call from your code is never gated. To show a message in the prompt line, set {@link InputConfig.error | error}. It takes a title, an optional description, and an optional collapsible flag.

> **Note**: {@link ChatInstance.updateInputFieldVisibility | updateInputFieldVisibility} and {@link ChatInstance.updateInputIsDisabled | updateInputIsDisabled} are deprecated. Use {@link InputConfig.isVisible | isVisible} and {@link InputConfig.isDisabled | isDisabled} instead.

## Placeholder and character limit

There is no placeholder field. The placeholder is the `input_placeholder` string. You set it with {@link PublicConfig.strings | strings} (see {@link LanguagePack}). The rest of the `input_*` strings label the send, upload, and action buttons. {@link InputConfig.maxInputCharacters | maxInputCharacters} caps the input length. It defaults to 10000.

## Mentions and commands

{@link InputConfig.mention | mention} is an `@`-style trigger. {@link InputConfig.command | command} is a `/`-style trigger. Each one takes a {@link TriggerSuggestionConfig}. That config sets the `trigger` character and an optional `triggerPosition`. It also shares the {@link BaseSuggestionConfig} fields used by every suggestion surface. `items` is a static array or an async function of the query. The other shared fields are `minQueryLength`, `debounceMs`, and `onSelect`. Picking an item inserts a token chip. The chip is built from a {@link SuggestionItem}. `onRemove` mirrors `onSelect` when a chip is deleted. `showTriggerInChip` keeps or drops the trigger character. `renderCustomToken` swaps in your own chip. Pair a pick with {@link ChatInstanceInput.updateStructuredData | updateStructuredData}. Then the picked values ride along with the message.

```ts
import type { PublicConfig } from "@carbon/ai-chat";

const config: PublicConfig = {
  input: {
    mention: {
      trigger: "@",
      items: async (query) =>
        [{ id: "1", label: "Alice" }].filter((item) =>
          item.label.toLowerCase().includes(query.toLowerCase()),
        ),
    },
    command: {
      trigger: "/",
      triggerPosition: "start",
      items: [{ id: "summarize", label: "summarize" }],
    },
  },
};
```

See the mentions-and-commands examples: [React](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/prompt-line-mentions-and-commands) and [web component](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/prompt-line-mentions-and-commands). For custom chips, see the custom-render variants: [React](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/prompt-line-mentions-and-commands-custom-render) and [web component](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/prompt-line-mentions-and-commands-custom-render).

## Typeahead autocomplete

{@link InputConfig.autocomplete | autocomplete} takes an {@link AutocompleteConfig}. It uses the same shared fields. But it completes the trailing word. It has no trigger character. It inserts plain text, not a chip. To replace the dropdown on any suggestion surface, pass `renderCustomList`. It receives {@link CustomListProps}: `items`, `query`, `onSelect`, and `onDismiss`.

See the typeahead examples: [React](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/prompt-line-typeahead) and [web component](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/prompt-line-typeahead). For a custom list, see: [React](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/prompt-line-typeahead-custom) and [web component](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/prompt-line-typeahead-custom).

## Starter prompts

{@link InputConfig.starters | starters} shows a {@link SuggestionItem} list. It shows while the editor is empty, focused, and editable. Picking one inserts its `value` (or `label`). It also sends that text in the same turn. The send is gated by {@link InputConfig.isSendDisabled | isSendDisabled}. These differ from the home screen's starter buttons ({@link HomeScreenConfig.starters | starters}) — see [Home screen](./Homescreen.md).

## Custom actions and the expanded layout

{@link InputConfig.actions | actions} renders custom buttons. They use the header's {@link ToolbarAction} shape. In the default compact layout, they sit in a popover. An Add ("+") button opens it. {@link InputConfig.expanded | expanded} splits the input into two rows. The first row is the editor. The second is an actions-and-send row. The actions render inline as icon buttons. They collapse into an overflow menu when space runs short. `fixed: true` keeps one out of the overflow. When file uploads are on, an "Add files" action is prepended for you. The expanded layout also opens the {@link WriteableElementName.PROMPT_LINE_ACTIONS_END | PROMPT_LINE_ACTIONS_END} slot — see [Slots](./WriteableElements.md).

## File uploads

Uploads are set up on their own. You configure them with {@link PublicConfig.upload | upload} and an {@link UploadConfig}. But the attach button renders in the prompt line. Set `is_on` to `true`. Then provide {@link UploadConfig.onFileUpload | onFileUpload}. It receives the `File` and an `AbortSignal`. It returns a `Promise` of {@link StructuredData}. Constrain uploads with `accept`, `maxFileSizeBytes`, and `maxFiles`. See [Structured data](./StructuredData.md) for the payload the handler returns.

See the file-upload examples: [React](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/prompt-line-file-upload) and [web component](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/prompt-line-file-upload).

## Driving the input from your code

The `instance.input` namespace ({@link ChatInstanceInput}) drives the editor from your code. Reach the instance as shown in [React](./React.md) or [Web component](./WebComponent.md). {@link ChatInstanceInput.updateContent | updateContent} replaces the content. You pass an updater over the Tiptap `JSONContent` doc. It upgrades the lightweight textarea to the rich editor when a write needs it. It stages plain-text writes while the input is hidden. Pair it with {@link getRawText} and {@link textToDoc} for plain-text edits. The older {@link ChatInstanceInput.updateRawValue | updateRawValue} is deprecated. {@link ChatInstanceInput.updateStructuredData | updateStructuredData} stages a payload. The payload merges into the next message the user sends from the UI (see [Structured data](./StructuredData.md)). {@link ChatInstanceInput.getEditor | getEditor} is the escape hatch. It loads the rich editor on demand. It resolves the live `Editor`. From React, re-await it inside handlers. Do not cache it in state. Keep your input configs reference-stable.

```ts
await instance.input.updateContent(() => textToDoc("Summarize my open orders"));

const editor = await instance.input.getEditor();
editor.commands.focus();
```

## Extending the editor

{@link InputConfig.tiptap | tiptap} `extensions` appends your own [Tiptap](https://tiptap.dev/docs) extensions. They go after the curated bundle. Memoize the array. A new reference recreates the editor. Custom nodes render into the light DOM with {@link renderInLightDom}, so your styles apply. You also render them inside sent user-message bubbles. Use {@link ChatContainerProps.renderUserDefinedInputNode | renderUserDefinedInputNode} in React. Use a {@link WCRenderUserDefinedInputNode} on the web component. The curated factories behind the config fields are exported too. Reach for them when you build your own extension stack. They are {@link buildCarbonExtensions}, {@link carbonMention}, {@link carbonCommand}, {@link carbonAutocomplete}, and {@link carbonStarterTrigger}.

See the custom-node examples: [React](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/prompt-line-custom-render) and [web component](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/prompt-line-custom-render). For input-rule code snippets, see: [React](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react/prompt-line-code-snippet) and [web component](https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components/prompt-line-code-snippet).

## Slots and send events

Render your own content around the input with five slots. They are {@link WriteableElementName.BEFORE_INPUT_ELEMENT | BEFORE_INPUT_ELEMENT}, {@link WriteableElementName.AFTER_INPUT_ELEMENT | AFTER_INPUT_ELEMENT}, {@link WriteableElementName.PROMPT_LINE_SEND_BUTTON_START | PROMPT_LINE_SEND_BUTTON_START}, {@link WriteableElementName.PROMPT_LINE_ACTIONS_END | PROMPT_LINE_ACTIONS_END} (expanded layout only), and {@link WriteableElementName.HOME_SCREEN_BEFORE_INPUT_ELEMENT | HOME_SCREEN_BEFORE_INPUT_ELEMENT} — see [Slots](./WriteableElements.md). A send from the prompt line fires {@link BusEventType.PRE_SEND | PRE_SEND} and {@link BusEventType.SEND | SEND}. {@link MessageSendSource.MESSAGE_INPUT | MESSAGE_INPUT} or {@link MessageSendSource.HOME_SCREEN_INPUT | HOME_SCREEN_INPUT} tells you which surface sent it. Message handling itself lives in [Server communication](./CustomServer.md).

## Related

- [Slots](./WriteableElements.md) — render your own content around the input, the send button, and other areas of the chat.
- [Structured data](./StructuredData.md) — the typed payload that rides along with a user message, including file uploads.
- [Home screen](./Homescreen.md) — the optional landing view whose input shares this configuration.
- [UI customization](./Customization.md) — the hub for tailoring the chat UI.
