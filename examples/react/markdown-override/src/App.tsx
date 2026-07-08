/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Markdown overrides.
 *
 * Demonstrates the five `markdown.customRenderers` hooks together:
 *   - `codeBlock` — element replacement: render fenced code through a
 *     `cds-aichat-code-snippet` with `detectLanguage` set to `false`.
 *   - `table` — element replacement: render markdown tables through a Carbon
 *     `DataTable` (`Table`/`TableHead`/`TableRow`/…) from `@carbon/react`
 *     instead of the default `cds-aichat-table`.
 *   - `link` — attribute transform: append a `utm_source` query param and
 *     force anchors to open in the same tab (`target="_self"`). The framework
 *     still renders the `<a>` and its children.
 *   - `image` — attribute transform: resolve a custom `app-image:` reference
 *     to a real `src` and make the image clickable (alert on click).
 *   - `checklist` — behavior hook: make task-list checkboxes actionable, log
 *     toggles, and persist state via `getChecked` so it survives re-renders.
 *
 * Start reading at `App()` and the `useMemo`'d `customRenderers` object.
 */

import {
  ChatCustomElement,
  type ChatContainerPropsMarkdown,
  type MarkdownRendererCodeBlockArgs,
  type MarkdownRendererImageArgs,
  type MarkdownRendererLinkArgs,
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
import React, { useMemo, useReducer, useRef } from "react";
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

// The image the `image` override resolves the markdown's `app-image:lions`
// reference to — the same photo the demo site uses for its "image" utterance.
const DEMO_IMAGE =
  "https://news-cdn.softpedia.com/images/news2/Picture-of-the-Day-Real-Life-Simba-and-Mufasa-Caught-on-Camera-in-Tanzania-392687-2.jpg";

function App() {
  // Checklist state lives in a ref so the `customRenderers` object below can
  // stay referentially stable (an empty dep array) while still reading the
  // latest toggles; `forceUpdate` re-renders so `getChecked` runs again.
  const checklistState = useRef<Record<string, boolean>>({});
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);

  // The customRenderers object must be referentially stable across renders —
  // a fresh object identity would force the markdown element to re-reconcile
  // every slot host on every render.
  const markdown = useMemo<ChatContainerPropsMarkdown>(
    () => ({
      customRenderers: {
        // Element replacement — render fenced code without a detected-language
        // label.
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
        // Element replacement — render markdown tables through a Carbon
        // DataTable instead of the default cds-aichat-table.
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
        // Attribute transform — rewrite the href and keep navigation in the
        // same tab. Returning attribute overrides keeps the framework
        // rendering the `<a>` and its children.
        link: ({ href }: MarkdownRendererLinkArgs) => {
          try {
            const url = new URL(href);
            url.searchParams.set("utm_source", "ai-chat");
            return {
              href: url.toString(),
              target: "_self",
              rel: "noopener noreferrer",
            };
          } catch {
            return null;
          }
        },
        // Attribute transform — resolve a custom image reference to a real src
        // and make the image clickable. The inline `onclick` works because this
        // example does not enable HTML sanitization; a sanitized/CSP setup
        // would instead delegate a click listener on the host.
        image: ({ src, attributes }: MarkdownRendererImageArgs) => {
          if (src.startsWith("app-image:")) {
            return {
              src: DEMO_IMAGE,
              attributes: {
                ...attributes,
                style:
                  "cursor: pointer; max-width: 100%; height: auto; border-radius: 8px;",
                title: "Click me",
                onclick: "alert('You clicked the image!')",
              },
            };
          }
          return null;
        },
        // Behavior hook — persist toggles and reflect them back on re-render.
        checklist: {
          getChecked: ({ id, checked }) =>
            id in checklistState.current ? checklistState.current[id] : checked,
          onToggle: ({ id, label, checked }) => {
            checklistState.current[id] = checked;
            console.log(
              `[checklist] "${label}" → ${checked ? "done" : "todo"}`,
            );
            forceUpdate();
          },
        },
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
