/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: renderUserDefinedInputNode callback for prompt-line-code-snippet
 *
 * Demonstrates: rendering the host-defined `codeSnippetBlock` node inside a
 * sent user message bubble. The chat invokes this once per non-built-in node
 * in the message's `display_content`; the web-component flavor returns an
 * `HTMLElement` (a read-only `<cds-aichat-code-snippet>`) for the
 * `codeSnippetBlock` type and `null` for everything else.
 *
 * APIs exercised:
 *   - `WCRenderUserDefinedInputNode` (type) from `@carbon/ai-chat`
 *   - `<cds-aichat-code-snippet>` from `@carbon/ai-chat-components`
 *
 * Start reading at: the `renderCodeSnippet` callback below.
 */

// Registers the <cds-aichat-code-snippet> custom element.
import "@carbon/ai-chat-components/es/components/code-snippet/index.js";
import { WCRenderUserDefinedInputNode } from "@carbon/ai-chat";

import { CODE_SNIPPET_NODE } from "./codeSnippetNode";

const renderCodeSnippet: WCRenderUserDefinedInputNode = ({ node }) => {
  if (node.type !== CODE_SNIPPET_NODE) {
    // Not a node this example owns — let the chat handle it.
    return null;
  }

  const snippet = document.createElement("cds-aichat-code-snippet");
  snippet.setAttribute("highlight", "");
  snippet.setAttribute("hide-header", "");
  (snippet as unknown as { code: string }).code = String(
    node.attrs?.code ?? "",
  );
  return snippet;
};

export { renderCodeSnippet };
