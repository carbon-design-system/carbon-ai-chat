# ChatInstanceInput

- Kind: Interface
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.ChatInstanceInput.html

Methods for controlling the input field.

## Signature

```ts
interface ChatInstanceInput
```

## Members

### getEditor

`getEditor: () => Promise<Editor>`

**Experimental.**

Loads the rich Tiptap editor on demand and resolves with the live
`Editor`. Chats that don't configure an advanced input feature
(InputConfig.mention / InputConfig.command /
InputConfig.autocomplete / InputConfig.starters /
InputConfig.tiptap) render a lightweight textarea and ship no
Tiptap; the first call to this method dynamically imports the editor and
upgrades that textarea in place — already-typed text, the caret, and focus
carry over. The upgrade is one-way for the life of the session: once the
rich editor loads it stays loaded.

Rejects with `"Input is not currently rendered"` when there is no input
surface to upgrade (for example the input is hidden via
InputConfig.isVisible or the chat is closed). Concurrent calls
share a single upgrade and resolve with the same instance.

Sole escape hatch from the curated public surface. Use the resolved editor
for direct Tiptap operations the facade doesn't cover:
- `editor.commands.*` for imperative actions (focus, blur,
  clearContent, setTextSelection, selectAll, undo, redo, insertContent
  for cursor-position insertion, plus everything else Tiptap exposes —
  toggleBold, insertContentAt, etc.)
- `editor.chain()` for command chaining
- `editor.view` for the live PM `EditorView`
- `editor.view.dispatch(setHostOriginMeta(tr))` for raw transaction
  dispatch — the host owns the `aichatOrigin` meta tagging
- `editor.state.doc` for the live PMNode
- `editor.getJSON()` for a JSONContent snapshot (equivalent to
  `getState().input.content` but live, not the immutable store copy)
- `editor.extensionStorage` for per-extension state
- `editor.on(...)` for low-level event subscriptions

## Examples

```ts
const editor = await instance.input.getEditor();
editor.commands.focus();
```

**Working with the resolved editor from React** — two patterns:

1. **Don't capture in state.** A config update that genuinely changes the
   extension set still replaces the editor, and holding the old one in
   `useState` retains a stale reference. Re-await `getEditor()` inside
   handlers, or in a `useEffect` keyed on the configs behind the editor:
   ```ts
   useEffect(() => {
     let off: (() => void) | undefined;
     chat.instance.input.getEditor().then((editor) => {
       const handler = () => { ... };
       editor.on("update", handler);
       off = () => editor.off("update", handler);
     });
     return () => off?.();
   }, [extensions, mention, command]);
   ```

2. **Memoize `tiptap.extensions`.** The Carbon-curated configs are
   compared by value, so rebuilding an equivalent one costs nothing
   beyond the comparison — as long as the callbacks inside it hold their
   identity, since those compare by reference. Extensions you construct
   yourself are compared by reference — a fresh array of new instances
   every render reads as a real change and replaces the editor mid-edit,
   losing its undo history.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.ChatInstanceInput.html#geteditor)

### updateContent

`updateContent: (updater: (previous: JSONContent) => JSONContent) => Promise<void>`

**Experimental.**

Replace the entire input content with the result of an updater that
receives the current Tiptap JSONContent doc and returns the next.

The updater is synchronous, but the returned promise reflects when the
content has actually been applied. If the input is showing the lightweight
textarea and the updater returns a doc with non-text nodes or marked text,
the rich editor is loaded on demand (upgrading the surface in place,
preserving the caret and focus) and the promise resolves once the rich
content is applied. Plain-text writes — and writes when the rich editor is
already mounted — apply immediately and the promise resolves on the same
tick.

While the input is hidden or not yet mounted, a plain-text result is staged
as the pending value and seeds the field when it renders; a result with
non-text content throws, because there is no surface to upgrade.

## Examples

```ts
await instance.input.updateContent(() => ({
  type: "doc",
  content: [{
    type: "paragraph",
    content: [
      { type: "text", text: "Hi " },
      { type: "mention", attrs: { id: "1", label: "Alice", value: "@alice" } },
    ],
  }],
}));
```

For cursor-position insertion, use the {@link ChatInstanceInput.getEditor}
escape hatch:
`(await instance.input.getEditor()).commands.insertContent(...)`.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.ChatInstanceInput.html#updatecontent)

### updateRawValue

`updateRawValue: (updater: (previous: string) => string) => void`

**Deprecated.** Use ChatInstanceInput.updateContent instead, which now
covers every case this method does — including writes before the input is
mounted. The equivalent plain-text updater, using getRawText and
textToDoc, is:

```ts
instance.input.updateContent((prev) =>
  textToDoc(updater(getRawText(prev))),
);
```

Throws if the editor doc contains any node type other than
`paragraph`, `text`, or `hardBreak`, or if any text node carries
marks. Empty paragraphs pass through; `hardBreak` renders as `\n` in
the rawValue projection. Emits one deprecation warning per session.

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.ChatInstanceInput.html#updaterawvalue)

### updateStructuredData

`updateStructuredData: (updater: (previous: StructuredData) => StructuredData) => void`

**Experimental.**

Updates the pending structured data that will be merged into the next outgoing MessageRequest
when the user sends a message via the UI send button or Enter key. The updater function receives the
current pending structured data (or `undefined` if none is set) and should return the new value.
Return `undefined` to clear the pending structured data.

This is the primary mechanism for pushing structured inputs (form fields, file references, etc.)
into the active input so they are included when the user hits Send.

## Examples

```ts
instance.input.updateStructuredData((prev) => ({
  ...prev,
  fields: [
    ...(prev?.fields ?? []),
    { id: "rating", value: 4 },
  ],
}));
```

```ts
instance.input.updateStructuredData(() => ({
  fields: [{ id: "selection", value: ["billing", "shipping"] }],
}));
```

```ts
instance.input.updateStructuredData(() => undefined);
```

[Reference](https://chat.carbondesignsystem.com/version/v1.19.0/docs/interfaces/Type_reference.ChatInstanceInput.html#updatestructureddata)
