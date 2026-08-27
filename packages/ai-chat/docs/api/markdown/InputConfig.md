# InputConfig

- Kind: Interface
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.InputConfig.html

Configuration for the input field in the main chat and homescreen.

## Signature

```ts
interface InputConfig
```

## Members

### actions

`actions?: ToolbarAction[]`

**Experimental.**

Custom action buttons for the chat input, sharing the header's
ToolbarAction shape. How they render depends on the layout:
in the default (compact) layout an Add ("+") button opens a Carbon
popover containing these actions; in the expanded layout
(InputConfig.expanded) they render inline as icon buttons that
collapse into a "more" overflow menu when the row runs out of room
(set `fixed: true` to keep an action out of the overflow). If file
uploads are also enabled, an "Add files" action is automatically
prepended and the standalone upload button is not rendered. The button
size is controlled by the input, so a per-action `size` is ignored.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.InputConfig.html#actions)

### autocomplete

`autocomplete?: BaseSuggestionConfig`

**Experimental.**

Live-typeahead autocomplete config. Selection inserts plain text; no
token chip is rendered.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.InputConfig.html#autocomplete)

### command

`command?: TriggerSuggestionConfig`

**Experimental.**

`/`-style command trigger config. Same shape as InputConfig.mention;
inserts a `command` node on selection.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.InputConfig.html#command)

### error

`error?: { collapsible?: boolean; description?: string; title: string }`

**Experimental.**

Error configuration for displaying an error message in the input field.
When provided, an error message will be displayed in the prompt line.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.InputConfig.html#error)

### expanded

`expanded?: boolean`

**Experimental.**

Renders the input in an expanded layout: the editor fills its own
full-width row, with the message actions and send control on a second
row beneath it (actions to the start, send to the end). When set, any
InputConfig.actions render inline as icon buttons in that actions
row — overflowing into a "more" menu when space is tight — instead of
inside the Add ("+") popover, and the
WriteableElementName.PROMPT_LINE_ACTIONS_END slot becomes
available. Defaults to false.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.InputConfig.html#expanded)

### isDisabled

`isDisabled?: boolean`

If true, the main input surface starts in a disabled (read-only) state.
Equivalent to PublicConfig.isReadonly, but scoped just to the assistant input.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.InputConfig.html#isdisabled)

### isSendDisabled

`isSendDisabled?: boolean`

**Experimental.**

If true, the send button renders disabled and Enter-driven send is
gated. Orthogonal to InputConfig.isDisabled: the editor stays
editable, only the send path is suppressed.

Programmatic `instance.send(...)` is NOT gated by this flag.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.InputConfig.html#issenddisabled)

### isVisible

`isVisible?: boolean`

Controls whether the main input surface is visible when the chat loads.
Defaults to true.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.InputConfig.html#isvisible)

### maxInputCharacters

`maxInputCharacters?: number`

The maximum number of characters allowed in the input field. Defaults to 10000.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.InputConfig.html#maxinputcharacters)

### mention

`mention?: TriggerSuggestionConfig`

**Experimental.**

`@`-style mention trigger config. The chat layer wires this into a
`carbonMention` Tiptap extension; the editor inserts a `mention` node on
selection and surfaces token chip rendering via the light-DOM portal
handshake.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.InputConfig.html#mention)

### starters

`starters?: StartersConfig`

**Experimental.**

Starter prompts shown while the editor is empty + focused + editable.
Selection inserts the item's `value` (or `label`) AND auto-sends in
the same turn (gated by InputConfig.isSendDisabled).

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.InputConfig.html#starters)

### tiptap

`tiptap?: { extensions?: Extension<any, any>[] }`

**Experimental.**

Tiptap-shaped configuration. The `tiptap` namespace signals "you're
stepping into Tiptap's API directly" — use InputConfig.mention /
`command` / `autocomplete` / `starters` for Carbon-curated chat features.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.InputConfig.html#tiptap)
