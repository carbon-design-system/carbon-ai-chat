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
 * message's `display_content`; the web-component flavor returns an
 * `HTMLElement` (a Carbon `<cds-tile>`) for the `tileChip` type and `null`
 * for everything else.
 *
 * APIs exercised:
 *   - `WCRenderUserDefinedInputNode` (type) from `@carbon/ai-chat`
 *
 * Start reading at: the `renderTileChip` callback below.
 */

import { WCRenderUserDefinedInputNode } from "@carbon/ai-chat";

import { buildTileCard } from "./tileCard";
import { TILE_CHIP_NODE } from "./tileChipNode";

const renderTileChip: WCRenderUserDefinedInputNode = ({ node }) => {
  if (node.type !== TILE_CHIP_NODE) {
    // Not a node this example owns — let the chat handle it.
    return null;
  }

  return buildTileCard(
    String(node.attrs?.label ?? ""),
    String(node.attrs?.description ?? ""),
  );
};

export { renderTileChip };
