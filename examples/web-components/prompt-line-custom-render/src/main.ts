/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Input custom render (Web components)
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
 *   - `<cds-aichat-custom-element>` + `.renderUserDefinedInputNode` property
 *   - `PublicConfig.input.tiptap.extensions` (the custom `tileChip` node)
 *   - `ChatInstance.input.updateContent` (clear + inject the tile)
 *   - `ChatInstance.input.updateStructuredData` (replace the pending metadata)
 *   - `.onBeforeRender` (captures the `ChatInstance`)
 *   - `PublicConfig.layout.showFrame` / `openChatByDefault`
 *
 * Start reading at: the `config` constant, then `handleTileClick` and `render`.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";
// Registers <cds-clickable-tile> for the page grid.
import "@carbon/web-components/es/components/tile/index.js";
// Document-level Carbon styles. Load-bearing: the page-grid Carbon tiles live
// outside the chat, so they need the Carbon theme tokens (`--cds-*`) on the
// page.
import "@carbon/styles/css/styles.css";
import { type ChatInstance, type PublicConfig } from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";
import { renderTileChip } from "./renderTileChip";
import { tileChipNode, TILE_CHIP_NODE } from "./tileChipNode";
import { tiles, type Tile } from "./tiles";

// Module-scope so the reference is stable across renders — a fresh `input`
// object (or `tiptap.extensions` array) would make the editor recreate.
const config: PublicConfig = {
  // Route outbound user messages through the local mock handler.
  messaging: { customSendMessage },
  layout: {
    // Hide the default chat frame so the chat fills the sidebar container.
    showFrame: false,
  },
  // Auto-open so the sidebar shows the conversation from first paint.
  openChatByDefault: true,
  input: {
    // Register the host-defined `tileChip` node.
    tiptap: { extensions: [tileChipNode] },
  },
};

@customElement("my-app")
export class Demo extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .page {
      display: flex;
      min-block-size: 100vh;
    }

    .page__body {
      flex: 1 1 auto;
      padding: 2.5rem;
      overflow-y: auto;
    }

    .page__title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .page__intro {
      max-inline-size: 60ch;
      margin: 0.5rem 0 0;
      color: #525252;
    }

    .tile-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
      margin-block-start: 1.75rem;
      max-inline-size: 640px;
    }

    .sidebar {
      position: sticky;
      inset-block-start: 0;
      flex: 0 0 auto;
      block-size: 100vh;
      inline-size: 380px;
      border-inline-start: 1px solid #e0e0e0;
    }

    .sidebar .chat-custom-element {
      block-size: 100%;
      inline-size: 100%;
    }

    /* Stacks the label over the description inside the page-grid tiles. */
    .tile-chip__label {
      display: block;
    }

    .tile-chip__desc {
      display: block;
      margin-block-start: 0.25rem;
      color: #525252;
      font-size: 0.875rem;
    }
  `;

  // Captured in onBeforeRender so the tile-click handler can reach the live
  // instance.
  @state()
  accessor instance: ChatInstance | undefined;

  onBeforeRender = (instance: ChatInstance) => {
    this.instance = instance;
  };

  handleTileClick = (tile: Tile) => {
    const instance = this.instance;
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
  };

  render() {
    return html`
      <div class="page">
        <main class="page__body">
          <h1 class="page__title">Pick a tile to compose your message</h1>
          <p class="page__intro">
            Each tile clears the chat input and drops a copy of itself into it,
            then attaches the tile to the message's structured data. Press send
            to see the tile rendered inside the message bubble.
          </p>
          <div class="tile-grid">
            ${tiles.map(
              (tile) => html`
                <cds-clickable-tile
                  class="tile-chip"
                  @click=${() => this.handleTileClick(tile)}
                >
                  <strong class="tile-chip__label">${tile.label}</strong>
                  <span class="tile-chip__desc">${tile.description}</span>
                </cds-clickable-tile>
              `,
            )}
          </div>
        </main>
        <aside class="sidebar">
          <cds-aichat-custom-element
            class="chat-custom-element"
            .onBeforeRender=${this.onBeforeRender}
            .messaging=${config.messaging}
            .input=${config.input}
            .layout=${config.layout}
            .openChatByDefault=${config.openChatByDefault}
            .renderUserDefinedInputNode=${renderTileChip}
          ></cds-aichat-custom-element>
        </aside>
      </div>
    `;
  }
}
