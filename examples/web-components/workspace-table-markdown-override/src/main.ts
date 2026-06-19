/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Workspace table markdown override, web
 * components flavor.
 *
 * Demonstrates `WCCustomMarkdownRenderers.table` combined with the
 * workspace panel API. The override wraps each markdown table in a
 * `cds-aichat-card` whose `cds-aichat-toolbar` header carries a Carbon
 * Maximize icon button. Clicking that button mounts a
 * `workspace-table-content` Lit element (which renders the same
 * `cds-aichat-table` used by the chat's default markdown table renderer,
 * inside a `cds-aichat-workspace-shell`) into the workspace via
 * `instance.writeableElements.workspacePanelElement`, then opens the
 * workspace panel.
 *
 * The chat element is declared in `index.html` directly in page light DOM
 * (no `<my-app>` wrapper) for consistency with the rest of the
 * markdown-extensibility examples.
 *
 * Per the API contract, the renderer reuses the same card element
 * references across calls (cached by `slotName`) so the markdown component
 * does not thrash the DOM during streaming re-renders.
 *
 * Start reading at the `el.markdown = ...` and `el.onBeforeRender = ...`
 * assignments below.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";
import "@carbon/ai-chat-components/es/components/card/index.js";
import "@carbon/ai-chat-components/es/components/toolbar/index.js";
import "@carbon/ai-chat-components/es/components/table/index.js";

import {
  BusEventType,
  type ChatInstance,
  type MarkdownRendererTableArgs,
  PanelType,
  type WCMarkdown,
} from "@carbon/ai-chat";
import type { Action } from "@carbon/ai-chat-components/es/components/toolbar/src/toolbar.js";
import Maximize16 from "@carbon/icons/es/maximize/16.js";

import { customSendMessage } from "./customSendMessage";
import "./workspaceTable";
import { type WorkspaceTableData } from "./workspaceTable";

// Captured in `onBeforeRender` so the table renderer (which closes over
// this module) can reach `customPanels` and `writeableElements` later.
let chatInstance: ChatInstance | null = null;

// Cache rendered card elements by slotName so streaming re-renders update
// the same DOM nodes in place — the markdown component re-invokes the
// callback on every reconcile.
const renderedCards = new Map<string, HTMLElement>();

// The element that gets assigned to writeableElements.workspacePanelElement.
// Reused across opens so we don't churn DOM between workspace sessions.
let workspaceContent: HTMLElement | null = null;

function ensureWorkspaceContent(): HTMLElement {
  if (!workspaceContent) {
    workspaceContent = document.createElement("workspace-table-content");
  }
  return workspaceContent;
}

const MARKDOWN_CONFIG: WCMarkdown = {
  customRenderers: {
    table: ({ headers, rows, slotName }: MarkdownRendererTableArgs) => {
      const title = "Orders";
      // Use cached card / refresh its toolbar/table content. The toolbar
      // expects an `actions: Action[]` array (objects, not children) and
      // renders each as a `cds-icon-button` with a tooltip internally.
      let card = renderedCards.get(slotName);
      let toolbar: HTMLElement | null = null;
      let body: HTMLElement | null = null;
      let table: HTMLElement | null = null;
      if (!card) {
        card = document.createElement("cds-aichat-card");
        card.setAttribute("is-flush", "");
        toolbar = document.createElement("cds-aichat-toolbar");
        toolbar.setAttribute("slot", "header");
        body = document.createElement("div");
        body.setAttribute("slot", "body");
        // The inline preview shares the same `cds-aichat-table` component
        // the chat uses by default — wrapping it in a card with a toolbar
        // is the entire override.
        table = document.createElement("cds-aichat-table");
        body.appendChild(table);
        card.appendChild(toolbar);
        card.appendChild(body);
        renderedCards.set(slotName, card);
      } else {
        toolbar = card.querySelector("cds-aichat-toolbar");
        body = card.querySelector('[slot="body"]');
        table = card.querySelector("cds-aichat-table");
      }

      // Toolbar properties (set imperatively because `actions` is an
      // object array and `titleText` is a complex property).
      if (toolbar) {
        (toolbar as unknown as { titleText: string }).titleText = title;
        const actions: Action[] = [
          {
            text: "Open in workspace",
            icon: Maximize16,
            onClick: () => {
              if (!chatInstance) {
                return;
              }
              const data: WorkspaceTableData = {
                title,
                headers: headers.map((c) => c.text),
                rows: rows.map((row) => row.map((c) => c.text)),
              };
              const content = ensureWorkspaceContent() as HTMLElement & {
                data?: WorkspaceTableData;
                instance?: ChatInstance;
              };
              content.data = data;
              content.instance = chatInstance;
              // Mount lazily on first click — by now the chat is fully
              // initialized and `writeableElements.workspacePanelElement`
              // is a real host node we can append into.
              const host = chatInstance.writeableElements.workspacePanelElement;
              if (host && !content.isConnected) {
                host.appendChild(content);
              }
              chatInstance.customPanels?.getPanel(PanelType.WORKSPACE).open({
                title,
                preferredLocation: "end",
                workspaceId: slotName,
              });
            },
          },
        ];
        (toolbar as unknown as { actions: Action[] }).actions = actions;
      }

      // `cds-aichat-table` headers/rows are JS properties (not HTML
      // attributes), so we set them imperatively. Streaming chunks land
      // here repeatedly with extended rows.
      if (table) {
        (table as unknown as { headers: { text: string }[] }).headers =
          headers.map((c) => ({ text: c.text }));
        (table as unknown as { rows: { cells: { text: string }[] }[] }).rows =
          rows.map((row) => ({
            cells: row.map((c) => ({ text: c.text })),
          }));
      }

      return card;
    },
  },
};

const el = document.querySelector("cds-aichat-custom-element") as
  | (HTMLElement & {
      messaging?: { customSendMessage: typeof customSendMessage };
      layout?: { showFrame?: boolean };
      openChatByDefault?: boolean;
      markdown?: WCMarkdown;
      onBeforeRender?: (instance: ChatInstance) => Promise<void> | void;
    })
  | null;

if (el) {
  el.messaging = { customSendMessage };
  el.layout = { showFrame: false };
  el.openChatByDefault = true;
  el.markdown = MARKDOWN_CONFIG;
  // Capture the instance for the table renderer; the workspace content is
  // mounted lazily on the first click (see the toolbar `onClick` above),
  // when `writeableElements.workspacePanelElement` is guaranteed to be a
  // real host node.
  el.onBeforeRender = (instance: ChatInstance) => {
    chatInstance = instance;
    instance.on({
      type: BusEventType.WORKSPACE_CLOSE,
      handler: () => {
        // No teardown needed — the content stays mounted and gets fresh
        // data on the next open.
      },
    });
  };
}
