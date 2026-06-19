/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Markdown override (code snippet, hide detected
 * language label).
 *
 * Demonstrates the `markdown.customRenderers.codeBlock` hook by replacing
 * the default fenced-code renderer with a `cds-aichat-code-snippet` whose
 * `detectLanguage` property is explicitly set to `false` — overriding the
 * markdown component's default of `true`. The result:
 *   - Fences with an explicit language (` ```python `) show the "Python"
 *     label as usual (explicit `language` always renders its label).
 *   - Fences with no language hint (` ``` `) render with no language label
 *     in the snippet header — only the line count.
 *
 * Start reading at `App()` and the `useMemo`'d `customRenderers` object.
 */

import {
  ChatCustomElement,
  type ChatContainerPropsMarkdown,
  type MarkdownRendererCodeBlockArgs,
  type PublicConfig,
} from "@carbon/ai-chat";
import Card from "@carbon/ai-chat-components/es/react/card";
import CodeSnippet from "@carbon/ai-chat-components/es/react/code-snippet";
import React, { useMemo } from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import "@carbon/styles/css/styles.css";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  layout: {
    showFrame: false,
  },
  openChatByDefault: true,
};

function App() {
  // The customRenderers object must be referentially stable across renders —
  // a fresh object identity would force the markdown element to re-reconcile
  // every slot host on every render.
  const markdown = useMemo<ChatContainerPropsMarkdown>(
    () => ({
      customRenderers: {
        codeBlock: ({ language, code }: MarkdownRendererCodeBlockArgs) => (
          <Card isFlush>
            <div slot="body">
              <CodeSnippet
                language={language}
                highlight
                detectLanguage={false}
                code={code}
                data-rounded
              />
            </div>
          </Card>
        ),
      },
    }),
    [],
  );

  return (
    <ChatCustomElement
      className="chat-custom-element"
      {...config}
      markdown={markdown}
    />
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
