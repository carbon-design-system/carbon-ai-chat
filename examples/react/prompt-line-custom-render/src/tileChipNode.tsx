/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: custom Tiptap node for the prompt-line-custom-render example
 *
 * The chat input is a Tiptap editor, and Tiptap is itself built on
 * ProseMirror — so the terms used below (`Node`, `addNodeView`, "NodeView",
 * ProseMirror) come from those two libraries, not from `@carbon/ai-chat`.
 * Authoring a custom input node is just authoring a plain Tiptap node.
 *
 * Demonstrates: authoring a host-defined Tiptap node and registering it on the
 * chat input via `PublicConfig.input.tiptap.extensions`. The node is an inline
 * atom whose node view renders a Carbon `Tile`. Because its type name
 * (`tileChip`) is not one of the chat's built-in node types, it is also
 * carried in the sent message's `display_content` and routed to the
 * `renderUserDefinedInputNode` callback for the message bubble.
 *
 * The chat editor runs inside a shadow root, so a node view built with raw
 * DOM cannot be reached by the host page's stylesheet. `renderInLightDom`
 * bridges the node view's content into the page's light DOM — where
 * `@carbon/styles` (loaded at the document level) styles the `Tile`. Here the
 * content is a React node, so it is `createPortal`-ed by the chat.
 *
 * APIs exercised:
 *   - `Node.create` / `mergeAttributes` / `Extension` (type) from `@tiptap/core`
 *   - `renderInLightDom` from `@carbon/ai-chat` (light-DOM portal bridge)
 *   - `PublicConfig.input.tiptap.extensions` (the export is consumed there)
 *
 * Start reading at: the `Node.create` call below.
 */

import { renderInLightDom } from "@carbon/ai-chat";
import { Tile } from "@carbon/react";
import { Node, mergeAttributes, type Extension } from "@tiptap/core";
import React from "react";

// The node type name. Kept distinct from the chat's built-in node types
// (doc / paragraph / text / hardBreak / mention / command) so the chat routes
// it to `renderUserDefinedInputNode` when the message is sent.
const TILE_CHIP_NODE = "tileChip";

/**
 * `Node.create` (from `@tiptap/core`) defines a custom Tiptap node — this is a
 * plain Tiptap extension, exactly what you'd write in any Tiptap project. The
 * chat does not invent its own node API; it just accepts your extensions via
 * `InputConfig.tiptap.extensions`.
 *
 * Node-config flags: `group/inline` make it an inline node (it sits in a line
 * of text); `atom` makes it a single indivisible unit (no editable content
 * inside, the cursor steps over it); `selectable: false` keeps the editor from
 * drawing a selection box around it.
 */
const tileChipNodeImpl = Node.create({
  name: TILE_CHIP_NODE,
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,

  // The node's data. These attrs are set by the host when it injects the node
  // (see `App.tsx` `handleTileClick`) and travel with the node in the sent
  // message's `display_content`.
  addAttributes() {
    return {
      tileId: { default: null },
      label: { default: "" },
      description: { default: "" },
      value: { default: "" },
    };
  },

  // Serialized text for the node. The chat's send button enables when the
  // editor has non-empty text, so the node must contribute text here.
  renderText({ node }) {
    return node.attrs.value || node.attrs.label || "";
  },

  // Standard Tiptap HTML (de)serialization for the node's schema. Not what the
  // user sees — that's `addNodeView` below — but Tiptap requires it.
  parseHTML() {
    return [{ tag: "span[data-tile-chip]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-tile-chip": "" })];
  },

  // `addNodeView` is the standard Tiptap hook for rendering a node with your
  // own DOM. Tiptap calls the returned factory once per occurrence of this
  // node in the document; the factory returns a Tiptap `NodeView` object.
  addNodeView() {
    return ({ node, editor }) => {
      // The chat editor runs inside a shadow root, so DOM we build here cannot
      // be reached by the host page's stylesheet. `renderInLightDom` bridges
      // our content into the page's light DOM (where `@carbon/styles` lives)
      // and hands back a `container` to mount in the editor in its place.
      // We pass a React node — the chat `createPortal`s it for us.
      const { container } = renderInLightDom({
        content: (
          <Tile className="tile-chip">
            <strong>{String(node.attrs.label ?? "")}</strong>
            <span>{String(node.attrs.description ?? "")}</span>
          </Tile>
        ),
        // The portal event must reach the listener on the chat wrapper.
        // `editor.view.dom` is already mounted under it, so dispatch from
        // there rather than the not-yet-connected `container`.
        dispatchTarget: editor.view.dom,
      });

      // The `NodeView` object Tiptap expects. `dom` is what Tiptap mounts in
      // the editor for this node. `ignoreMutation` / `stopEvent` tell
      // ProseMirror not to manage the interior — this is an atom whose content
      // is owned entirely by the portal, not the editor.
      return {
        dom: container,
        ignoreMutation: () => true,
        stopEvent: () => true,
      };
    };
  },
});

// `Node.create` returns a Tiptap `Node`, but `InputConfig.tiptap.extensions`
// is typed `Extension[]`. Tiptap accepts nodes, marks, and extensions
// interchangeably in that array at runtime — the cast just bridges the
// nominal type difference between `Node` and `Extension`.
const tileChipNode = tileChipNodeImpl as unknown as Extension;

export { tileChipNode, TILE_CHIP_NODE };
