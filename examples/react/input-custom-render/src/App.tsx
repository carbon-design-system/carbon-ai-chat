/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Input custom render
 *
 * Demonstrates: hosting the chat in a docked sidebar while the page body holds
 * a grid of clickable Carbon tiles. Clicking a tile clears the chat input,
 * injects a copy of the tile as a custom `tileChip` Tiptap node, and replaces
 * the pending structured data with metadata describing that tile. The input
 * stays fully editable — the user can also type. On send, the tile rides in
 * `display_content` and is rendered in the message bubble via
 * `renderUserDefinedInputNode`.
 *
 * APIs exercised:
 *   - `ChatCustomElement` + `renderUserDefinedInputNode` prop
 *   - `PublicConfig.input.tiptap.extensions` (the custom `tileChip` node)
 *   - `ChatInstance.input.updateContent` (clear + inject the tile)
 *   - `ChatInstance.input.updateStructuredData` (replace the pending metadata)
 *   - `onBeforeRender` (captures the `ChatInstance`)
 *   - `PublicConfig.layout.showFrame` / `openChatByDefault`
 *
 * Start reading at: the `config` constant, then `handleTileClick` and `App()`.
 */

import "./App.css";
// Document-level Carbon stylesheet. Load-bearing: the `tileChip` node view is
// bridged into the page's light DOM, so the injected Carbon `Tile` is styled
// by these document styles rather than anything inside the chat's shadow root.
import "@carbon/styles/css/styles.css";
import { ChatCustomElement, ChatInstance, PublicConfig } from "@carbon/ai-chat";
import { ClickableTile } from "@carbon/react";
import React, { useCallback, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import { renderTileChip } from "./renderTileChip";
import { tileChipNode, TILE_CHIP_NODE } from "./tileChipNode";
import { tiles, Tile } from "./tiles";

function App() {
  // Captured in onBeforeRender so the tile-click handler can reach the live
  // instance without closing over a stale render snapshot.
  const instanceRef = useRef<ChatInstance | null>(null);

  const onBeforeRender = useCallback((instance: ChatInstance) => {
    instanceRef.current = instance;
  }, []);

  const config: PublicConfig = useMemo(
    () => ({
      // Route outbound user messages through the local mock handler.
      messaging: { customSendMessage },
      layout: {
        // Hide the default chat frame so the chat fills the sidebar container.
        showFrame: false,
      },
      // Auto-open so the sidebar shows the conversation from first paint.
      openChatByDefault: true,
      input: {
        // Register the host-defined `tileChip` node. The reference is stable
        // (module singleton) so the editor is not recreated on every render.
        tiptap: { extensions: [tileChipNode] },
      },
    }),
    [],
  );

  const handleTileClick = useCallback((tile: Tile) => {
    const instance = instanceRef.current;
    if (!instance) {
      return;
    }

    // Replace the entire input doc: a fresh doc atomically clears any previous
    // tile and injects the clicked one as a single custom node.
    instance.input.updateContent(() => ({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: TILE_CHIP_NODE,
              attrs: {
                tileId: tile.id,
                label: tile.label,
                description: tile.description,
                value: tile.value,
              },
            },
          ],
        },
      ],
    }));

    // Replace the pending structured data wholesale so only the most recently
    // clicked tile rides along with the next send. Plain string metadata under
    // the `user_defined` escape hatch — no typed `fields` entry needed.
    instance.input.updateStructuredData(() => ({
      user_defined: {
        tileId: tile.id,
        label: tile.label,
        value: tile.value,
      },
    }));
  }, []);

  return (
    <div className="page">
      <main className="page__body">
        <h1 className="page__title">Pick a tile to compose your message</h1>
        <p className="page__intro">
          Each tile clears the chat input and drops a copy of itself into it,
          then attaches the tile to the message&apos;s structured data. Press
          send to see the tile rendered inside the message bubble.
        </p>
        <div className="tile-grid">
          {tiles.map((tile) => (
            <ClickableTile
              key={tile.id}
              className="tile-chip"
              onClick={() => handleTileClick(tile)}
            >
              <strong>{tile.label}</strong>
              <span>{tile.description}</span>
            </ClickableTile>
          ))}
        </div>
      </main>
      <aside className="sidebar">
        <ChatCustomElement
          className="chat-custom-element"
          {...config}
          onBeforeRender={onBeforeRender}
          renderUserDefinedInputNode={renderTileChip}
        />
      </aside>
    </div>
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
