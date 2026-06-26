/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Markdown override (code snippet + table).
 *
 * Demonstrates two `markdown.customRenderers` element-replacement hooks:
 *   - `codeBlock` — render fenced code through a `cds-aichat-code-snippet`
 *     with `detectLanguage` set to `false` (a bare fence shows only the line
 *     count, no detected-language label).
 *   - `table` — render markdown tables through a Carbon `DataTable` from
 *     `@carbon/react` instead of the default `cds-aichat-table`. The returned
 *     element is forwarded into page light DOM, so the page's global
 *     `@carbon/styles` CSS reaches it (inside the chat's shadow root it would
 *     not).
 *
 * Start reading at `App()` and the `useMemo`'d `customRenderers` object.
 */

import {
  ChatCustomElement,
  type ChatContainerPropsMarkdown,
  type MarkdownRendererCodeBlockArgs,
  type MarkdownRendererTableArgs,
  type PublicConfig,
} from "@carbon/ai-chat";
import Card from "@carbon/ai-chat-components/es/react/card";
import CodeSnippet from "@carbon/ai-chat-components/es/react/code-snippet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
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
        // Render markdown tables through a Carbon DataTable instead of the
        // default cds-aichat-table. The returned element is forwarded into
        // page light DOM, so the page's global `@carbon/styles` CSS styles it.
        table: ({ headers, rows }: MarkdownRendererTableArgs) => (
          <Table>
            <TableHead>
              <TableRow>
                {headers.map((cell, i) => (
                  <TableHeader key={i}>{cell.text}</TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, ri) => (
                <TableRow key={ri}>
                  {row.map((cell, ci) => (
                    <TableCell key={ci}>{cell.text}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
