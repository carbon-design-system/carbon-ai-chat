/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: renderUserDefinedInputNode callback for prompt-line-custom-render
 *
 * Demonstrates: rendering a host-defined Tiptap node inside a sent user
 * message bubble. The chat invokes this once per non-built-in node in the
 * message's `display_content`; it returns a Carbon `Tile` for the `tileChip`
 * type and `null` for everything else. The bubble already mounts into light
 * DOM, so the `Tile` is styled by the document-level `@carbon/styles`.
 *
 * APIs exercised:
 *   - `RenderUserDefinedInputNode` (type) from `@carbon/ai-chat`
 *   - `Tile` from `@carbon/react`
 *
 * Start reading at: the `renderTileChip` callback below.
 */

import { RenderUserDefinedInputNode } from "@carbon/ai-chat";
import { Tile } from "@carbon/react";
import React from "react";

import { TILE_CHIP_NODE } from "./tileChipNode";

const renderTileChip: RenderUserDefinedInputNode = ({ node }) => {
  if (node.type !== TILE_CHIP_NODE) {
    // Not a node this example owns — let the chat handle it.
    return null;
  }

  return (
    <Tile className="tile-chip">
      <strong>{String(node.attrs?.label ?? "")}</strong>
      <span>{String(node.attrs?.description ?? "")}</span>
    </Tile>
  );
};

export { renderTileChip };
