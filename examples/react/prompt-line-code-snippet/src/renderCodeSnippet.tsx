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
 * in the message's `display_content`; this returns a read-only
 * `CodeSnippet` for the `codeSnippetBlock` type and `null` for everything
 * else.
 *
 * APIs exercised:
 *   - `RenderUserDefinedInputNode` (type) from `@carbon/ai-chat`
 *   - `CodeSnippet` from `@carbon/ai-chat-components/es/react/code-snippet`
 *
 * Start reading at: the `renderCodeSnippet` callback below.
 */

import { RenderUserDefinedInputNode } from "@carbon/ai-chat";
import CodeSnippet from "@carbon/ai-chat-components/es/react/code-snippet.js";
import React from "react";

import { CODE_SNIPPET_NODE } from "./codeSnippetNode";

const renderCodeSnippet: RenderUserDefinedInputNode = ({ node }) => {
  if (node.type !== CODE_SNIPPET_NODE) {
    // Not a node this example owns — let the chat handle it.
    return null;
  }

  const code = String(node.attrs?.code ?? "");

  return <CodeSnippet code={code} highlight hideHeader />;
};

export { renderCodeSnippet };
