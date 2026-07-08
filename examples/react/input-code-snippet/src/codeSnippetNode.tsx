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
 *   - A node view that renders the React `CodeSnippet` wrapper — framed by a
 *     `Card` — from `@carbon/ai-chat-components` via `renderInLightDom`, so
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
 *   - `Card` from `@carbon/ai-chat-components/es/react/card`
 *   - `CodeSnippet` from `@carbon/ai-chat-components/es/react/code-snippet`
 *   - `PublicConfig.input.tiptap.extensions` (the export is consumed there)
 *
 * Start reading at: the `Node.create` call below.
 */

import { renderInLightDom } from "@carbon/ai-chat";
import Card from "@carbon/ai-chat-components/es/react/card.js";
import CodeSnippet from "@carbon/ai-chat-components/es/react/code-snippet.js";
import { Node, mergeAttributes, InputRule, type Extension } from "@tiptap/core";
import React from "react";

// The node type name. Kept distinct from the chat's built-in node types
// (doc / paragraph / text / hardBreak / mention / command) so the chat routes
// it to `renderUserDefinedInputNode` when the message is sent.
const CODE_SNIPPET_NODE = "codeSnippetBlock";

const EMPTY_FENCED = "\n```\n\n```\n";

function fence(code: string): string {
  return `\n\`\`\`\n${code}\n\`\`\`\n`;
}

interface EditableSnippetProps {
  initialCode: string;
  onCodeChange: (next: string) => void;
  onEscape: () => void;
}

/**
 * The React subtree mounted inside the node view. The chat `createPortal`s
 * this into the page's light DOM so document-level styles apply and CodeMirror
 * can manage its own focus / selection without the chat's shadow root in the
 * way. CodeMirror owns the live editing state — `initialCode` is read once at
 * mount, `onCodeChange` pushes each keystroke back into the Tiptap node's
 * attrs, and re-renders here are intentionally avoided (the node view's
 * `update` returns `true`, keeping this React tree alive across attr changes).
 */
function EditableSnippet({
  initialCode,
  onCodeChange,
  onEscape,
}: EditableSnippetProps) {
  // After the InputRule fires, ProseMirror parks a NodeSelection on this
  // atom block — the next keystroke would replace it with that character.
  // `focusEditor()` routes through CodeMirror's contenteditable (and queues
  // itself if CodeMirror is still loading), so the next keystroke enters
  // the editor instead. `host.focus()` won't do: `delegatesFocus: true`
  // lands on `.cm-scroller` (focusable for a11y, not editable).
  const snippetRef = React.useRef<
    (HTMLElement & { focusEditor?: () => void }) | null
  >(null);
  React.useEffect(() => {
    snippetRef.current?.focusEditor?.();
  }, []);

  const handleChange = React.useCallback(
    (event: Event) => {
      const detail = (event as CustomEvent<{ content: string }>).detail;
      onCodeChange(detail?.content ?? "");
    },
    [onCodeChange],
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onEscape();
    },
    [onEscape],
  );

  // The `Card` frames the editor so it reads as a contained region inside the
  // chat input. `slot="body"` / `slot="footer"` route the snippet and the hint
  // into the card's named slots — the card renders `body` then `footer`, so the
  // hint lands directly beneath the snippet. The hint reuses Carbon's
  // `cds--form__helper-text` class: styling comes entirely from `@carbon/styles`
  // (no inline styles), and it resolves here because this subtree is portaled
  // into the page's light DOM, where the example's global
  // `@carbon/styles/css/styles.css` import applies.
  return (
    <Card>
      <CodeSnippet
        slot="body"
        ref={snippetRef}
        code={initialCode}
        editable
        highlight
        hideHeader
        // Sizing: `Infinity` on both row maxes disables the snippet's internal
        // scrollbar so the prompt-line shell's own `overflow-y: auto` is the
        // only scroll surface. `5` on the row mins floors the empty editor at
        // ~80px — a comfortable multi-line code area, not a one-line field.
        // (The component models a row at 16px, shorter than CodeMirror's
        // rendered line, so 5 rows ≈ 3-4 visible lines.) It still grows as the
        // user types.
        maxCollapsedNumberOfRows={Infinity}
        maxExpandedNumberOfRows={Infinity}
        minCollapsedNumberOfRows={5}
        minExpandedNumberOfRows={5}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <div slot="footer" className="cds--form__helper-text">
        Esc to exit code editor
      </div>
    </Card>
  );
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

  // The triple-backtick trigger. When the user finishes typing ``` anywhere
  // in the paragraph, replace just the three backticks with an empty
  // `codeSnippetBlock`; any preceding text stays in its paragraph and
  // ProseMirror splits the block to make room for the inserted atom. The
  // closing fence is implicit — it's added by `getRawText` at send time via
  // `attrs.value`.
  addInputRules() {
    return [
      new InputRule({
        find: /```$/,
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

  // Escape exits the block. The React subtree above handles the case where
  // CodeMirror has focus; this hook covers the case where the outer editor's
  // selection sits on the node itself.
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
      const onCodeChange = (next: string) => {
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

      const onEscape = () => {
        const pos = getPos();
        if (typeof pos !== "number") {
          return;
        }
        // Atom block nodes have `nodeSize === 1`; the position immediately
        // after the block is `pos + 1`.
        const after = pos + 1;
        editor
          .chain()
          .insertContentAt(after, { type: "paragraph" })
          .focus(after + 1)
          .run();
      };

      // The chat's React tree `createPortal`s this subtree into the page's
      // light DOM — the same path as the React `Tile` in the
      // input-custom-render example. It relies on the host and chat sharing a
      // single React instance.
      //
      // `containerTag: "div"` — the card host (extends `cds-tile`) is
      // `display: block`; the default `<span>` wrapper would impose an inline
      // line-box and add the parent's line-height (~20px) as phantom leading.
      const { container } = renderInLightDom({
        content: (
          <EditableSnippet
            initialCode={String(node.attrs.code ?? "")}
            onCodeChange={onCodeChange}
            onEscape={onEscape}
          />
        ),
        dispatchTarget: editor.view.dom,
        containerTag: "div",
      });

      return {
        dom: container,
        // The interior is owned by CodeMirror — ProseMirror must not touch it.
        ignoreMutation: () => true,
        // CodeMirror handles all interior events; the React `onKeyDown` above
        // catches Escape before it bubbles here.
        stopEvent: () => true,
        // Same-type attrs updates from our own `onChange` handler must not
        // destroy the node view (that would unmount CodeMirror mid-keystroke).
        update: (next) => next.type.name === CODE_SNIPPET_NODE,
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
