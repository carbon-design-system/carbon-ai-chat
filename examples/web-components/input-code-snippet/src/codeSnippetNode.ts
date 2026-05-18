/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: custom Tiptap node for the input-code-snippet example
 *
 * The chat input is a Tiptap editor, and Tiptap is itself built on
 * ProseMirror — so the terms used below (`Node`, `InputRule`, `NodeView`,
 * ProseMirror) come from those two libraries, not from `@carbon/ai-chat`.
 *
 * Demonstrates:
 *   - A block-level Tiptap node whose `addInputRules()` swaps ``` for the node
 *     so the user never types the closing fence.
 *   - A node view that renders `<cds-aichat-code-snippet editable>` — framed by
 *     a `<cds-aichat-card>` — in light DOM (via `renderInLightDom`) so
 *     CodeMirror + Carbon styles work even though the chat editor lives inside
 *     a shadow root.
 *   - Keeping `attrs.code` (raw code) and `attrs.value` (fenced markdown) in
 *     sync so `getRawText` — which emits `attrs.value` for unknown atoms —
 *     ships standard ```...``` markdown when the message is sent.
 *   - An `Escape` keyboard shortcut that exits the block to a new paragraph.
 *
 * APIs exercised:
 *   - `Node.create` / `mergeAttributes` / `InputRule` / `Extension`
 *     from `@tiptap/core`
 *   - `renderInLightDom` from `@carbon/ai-chat` (light-DOM portal bridge)
 *   - `PublicConfig.input.tiptap.extensions` (the export is consumed there)
 *
 * Start reading at: the `Node.create` call below.
 */

// Registers the <cds-aichat-card> and <cds-aichat-code-snippet> custom elements.
import "@carbon/ai-chat-components/es/components/card/index.js";
import "@carbon/ai-chat-components/es/components/code-snippet/index.js";
import { renderInLightDom } from "@carbon/ai-chat";
import { Node, mergeAttributes, InputRule, type Extension } from "@tiptap/core";

// The node type name. Kept distinct from the chat's built-in node types
// (doc / paragraph / text / hardBreak / mention / command) so the chat routes
// it to `renderUserDefinedInputNode` when the message is sent.
const CODE_SNIPPET_NODE = "codeSnippetBlock";

const EMPTY_FENCED = "\n```\n\n```\n";

function fence(code: string): string {
  return `\n\`\`\`\n${code}\n\`\`\`\n`;
}

/**
 * `Node.create` (from `@tiptap/core`) defines a custom Tiptap node — this is a
 * plain Tiptap extension. The chat does not invent its own node API; it just
 * accepts your extensions via `InputConfig.tiptap.extensions`.
 *
 * Node-config flags: `group: "block"` makes it a block-level node (it sits on
 * its own line, between paragraphs); `atom: true` makes it a single
 * indivisible unit (ProseMirror does not manage the interior — CodeMirror,
 * inside the snippet, owns the editing state); `defining` + `isolating` keep
 * cursor navigation and structural commands from accidentally splitting or
 * absorbing the block.
 */
const impl = Node.create({
  name: CODE_SNIPPET_NODE,
  group: "block",
  atom: true,
  selectable: true,
  defining: true,
  isolating: true,

  // The node's data. `code` is the source of truth for what the user typed;
  // `value` is the fenced-markdown projection used by `getRawText` so the
  // outgoing message text contains standard ```...``` fences.
  addAttributes() {
    return {
      code: { default: "" },
      value: { default: EMPTY_FENCED },
    };
  },

  // Used by `editor.getText()`. The chat reads the outgoing text from the
  // JSON via `getRawText` (which uses `attrs.value`), not this method, but
  // Tiptap's send-enable heuristic does call into `renderText`.
  renderText({ node }) {
    return node.attrs.value ?? "";
  },

  parseHTML() {
    return [{ tag: "pre[data-code-snippet-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "pre",
      mergeAttributes(HTMLAttributes, { "data-code-snippet-block": "" }),
    ];
  },

  // The triple-backtick trigger. When the user finishes typing ``` at the
  // start of an empty line, replace the matched range with an empty
  // `codeSnippetBlock`. The closing fence is implicit — it's added by
  // `getRawText` at send time via `attrs.value`.
  addInputRules() {
    return [
      new InputRule({
        find: /^```$/,
        handler: ({ range, chain }) => {
          chain()
            .deleteRange(range)
            .insertContent({
              type: CODE_SNIPPET_NODE,
              attrs: { code: "", value: EMPTY_FENCED },
            })
            .run();
        },
      }),
    ];
  },

  // Escape exits the block. We don't try to detect "is the cursor inside the
  // snippet" via the editor selection — the NodeView is an atom, so when the
  // CodeMirror inside has focus, ProseMirror's selection sits on the block
  // node itself. The NodeView additionally listens for Escape on the snippet
  // element (see `addNodeView` below) for the case where CodeMirror has eaten
  // the focus.
  addKeyboardShortcuts() {
    return {
      Escape: ({ editor }) => {
        const { selection } = editor.state;
        const node = selection.$from.nodeAfter ?? selection.$from.parent;
        if (!node || node.type.name !== CODE_SNIPPET_NODE) {
          return false;
        }
        return editor
          .chain()
          .insertContentAt(selection.to, { type: "paragraph" })
          .focus()
          .run();
      },
    };
  },

  // `addNodeView` is the standard Tiptap hook for rendering a node with your
  // own DOM. Tiptap calls the returned factory once per occurrence of the
  // node in the document; the factory returns a Tiptap `NodeView` object.
  addNodeView() {
    return ({ node, editor, getPos }) => {
      // The chat editor runs inside a shadow root, so DOM we build here
      // cannot be reached by the host page's stylesheet — and the snippet
      // ships its own SCSS for CodeMirror. `renderInLightDom` bridges the
      // node-view content into the page's light DOM and hands back a
      // `container` to mount in the editor in its place.
      const snippet = document.createElement("cds-aichat-code-snippet");
      snippet.setAttribute("editable", "");
      snippet.setAttribute("highlight", "");
      snippet.setAttribute("hide-header", "");
      // Sizing: `Infinity` on both row maxes disables the snippet's internal
      // scrollbar so the chat input shell's own `overflow-y: auto` is the only
      // scroll surface. `5` on the row mins floors the empty editor at ~80px —
      // a comfortable multi-line code area, not a one-line field. (The
      // component models a row at 16px, shorter than CodeMirror's rendered
      // line, so 5 rows ≈ 3-4 visible lines.) It still grows as the user
      // types. Set as JS properties (not HTML attributes) so `Infinity`
      // round-trips as the number, not the string.
      const snippetProps = snippet as unknown as {
        code: string;
        maxCollapsedNumberOfRows: number;
        maxExpandedNumberOfRows: number;
        minCollapsedNumberOfRows: number;
        minExpandedNumberOfRows: number;
      };
      snippetProps.maxCollapsedNumberOfRows = Infinity;
      snippetProps.maxExpandedNumberOfRows = Infinity;
      snippetProps.minCollapsedNumberOfRows = 5;
      snippetProps.minExpandedNumberOfRows = 5;
      snippetProps.code = String(node.attrs.code ?? "");

      // CodeMirror emits `content-change` on every keystroke. Push the new
      // code into the node's attrs so a later send / re-render sees it.
      const onChange = (event: Event) => {
        const detail = (event as CustomEvent<{ content: string }>).detail;
        const next = detail?.content ?? "";
        const pos = getPos();
        if (typeof pos !== "number") {
          return;
        }
        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(pos, undefined, {
            code: next,
            value: fence(next),
          }),
        );
      };
      snippet.addEventListener("content-change", onChange);

      // Escape inside the snippet exits the block. CodeMirror by default does
      // not bind Escape to anything destructive, so we can listen for it on
      // the snippet element and forward to the editor.
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Escape") {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const pos = getPos();
        if (typeof pos !== "number") {
          return;
        }
        const after = pos + node.nodeSize;
        editor
          .chain()
          .insertContentAt(after, { type: "paragraph" })
          .focus(after + 1)
          .run();
      };
      snippet.addEventListener("keydown", onKeyDown);

      // Wrap the editor in a card so it reads as a contained region inside the
      // chat input. `slot="body"` / `slot="footer"` route the snippet and the
      // hint into the card's named slots — the card renders `body` then
      // `footer`, so the hint lands directly beneath the snippet. The hint
      // reuses Carbon's `cds--form__helper-text` class: styling comes entirely
      // from `@carbon/styles` (no inline styles), and it resolves because the
      // card is portaled into light DOM where the example's global
      // `@carbon/styles/css/styles.css` import applies.
      const card = document.createElement("cds-aichat-card");
      snippet.setAttribute("slot", "body");
      const hint = document.createElement("div");
      hint.setAttribute("slot", "footer");
      hint.className = "cds--form__helper-text";
      hint.textContent = "Esc to exit code editor";
      card.append(snippet, hint);

      // `containerTag: "div"` — the card host (extends `cds-tile`) is
      // `display: block`; the default `<span>` wrapper would impose an inline
      // line-box and add the parent's line-height (~20px) as phantom leading.
      const { container } = renderInLightDom({
        content: card,
        dispatchTarget: editor.view.dom,
        containerTag: "div",
      });

      // After the InputRule fires, ProseMirror parks a NodeSelection on this
      // atom block — the next keystroke would replace it with that character.
      // `focusEditor()` routes through CodeMirror's contenteditable (and
      // queues itself if CodeMirror is still loading), so the next keystroke
      // enters the editor instead. `snippet.focus()` won't do:
      // `delegatesFocus: true` lands on `.cm-scroller` (focusable for a11y,
      // not editable).
      queueMicrotask(() =>
        (snippet as HTMLElement & { focusEditor?: () => void }).focusEditor?.(),
      );

      return {
        dom: container,
        // The interior is owned by CodeMirror — ProseMirror must not touch it.
        ignoreMutation: () => true,
        // Swallow all events: CodeMirror handles them. (Escape is captured
        // by the listener we added above, which fires before this gate.)
        stopEvent: () => true,
        // Same-type attrs updates from our own `content-change` handler must
        // not destroy the node view (that would unmount CodeMirror mid-keystroke).
        update: (next) => next.type.name === CODE_SNIPPET_NODE,
        destroy: () => {
          snippet.removeEventListener("content-change", onChange);
          snippet.removeEventListener("keydown", onKeyDown);
        },
      };
    };
  },
});

// `Node.create` returns a Tiptap `Node`, but `InputConfig.tiptap.extensions`
// is typed `Extension[]`. Tiptap accepts nodes, marks, and extensions
// interchangeably in that array at runtime — the cast just bridges the
// nominal type difference between `Node` and `Extension`.
const codeSnippetNode = impl as unknown as Extension;

export { codeSnippetNode, CODE_SNIPPET_NODE };
