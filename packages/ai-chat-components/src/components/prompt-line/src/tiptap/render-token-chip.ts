/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Shared chip-rendering implementation used by both the editor's
 * `CarbonTokenNodeView` and the chat-side rich user message bubble. Builds
 * the wrapping `<span class="cds-aichat--token">` container, honors a
 * consumer-supplied `renderCustomToken`, and delegates the light-DOM portal
 * handshake to `renderInLightDom` so React adapters can hydrate custom chip
 * content. This is a thin token-specific wrapper over `renderInLightDom`.
 */

import type { ReactNode } from "react";

import { setVarsForSelector } from "../../../shared/dynamic-css-var-sheet.js";
import { renderInLightDom } from "./render-in-light-dom.js";
import type { SuggestionItem, TriggerSuggestionConfig } from "./types.js";

let tokenStyleRulesInstalled = false;

function ensureTokenStyleRules(): void {
  if (tokenStyleRulesInstalled) {
    return;
  }
  setVarsForSelector(".cds-aichat--token", { "white-space": "normal" });
  setVarsForSelector('.cds-aichat--token[data-token-context="composer"]', {
    color: "var(--cds-tag-color-blue)",
  });
  setVarsForSelector(
    '.cds-aichat--token[data-token-context="composer"]::selection',
    { "background-color": "var(--cds-tag-background-blue)" },
  );
  setVarsForSelector('.cds-aichat--token[data-token-context="historical"]', {
    color: "var(--cds-link-secondary)",
  });
  tokenStyleRulesInstalled = true;
}

/**
 * Attributes carried by a mention/command JSONContent node. Matches the
 * Tiptap mention shape (`id`, `label`) plus the carbon-specific `value`,
 * `data`, and `trigger` extensions added by `carbonMention`/`carbonCommand`.
 */
export interface TokenChipAttrs {
  id?: string;
  label?: string;
  value?: string;
  data?: unknown;
  /**
   * Trigger character to prefix onto the default chip text (e.g.
   * `/summarize` vs `summarize`). Set at insert time by
   * `resolveShowTriggerInChip` — defaults to command nodes only, but is
   * overridable per-config or per-item via `TriggerSuggestionConfig`/
   * `SuggestionItem`'s `showTriggerInChip`.
   */
  trigger?: string | null;
}

export interface RenderTokenChipArgs {
  /** Node attrs in mention shape. */
  attrs: TokenChipAttrs;
  /**
   * Subset of the trigger-suggestion config relevant to chip rendering. Only
   * `renderCustomToken` is read; other config fields are ignored.
   */
  config?: Pick<TriggerSuggestionConfig, "renderCustomToken">;
  /** Token type — usually `"mention"` or `"command"`. */
  type: "mention" | "command" | string;
  /**
   * Where to dispatch the light-DOM portal event when `renderCustomToken`
   * returns custom content. The NodeView passes the editor's `view.dom`
   * (already mounted under the chat wrapper) so the event reaches the portal
   * listener synchronously. When omitted, the event fires from the portal
   * container element itself with `bubbles: true, composed: true` — callers
   * that mount the chip lazily must ensure it lives under a listener subtree
   * before connection.
   */
  dispatchTarget?: EventTarget;
  /**
   * Visual variant to render. `"composer"` is the live, being-typed token in
   * the prompt-line editor; `"historical"` is a token inside an already-sent
   * message in the transcript. Drives the default chip's color/highlight —
   * see `ensureTokenStyleRules`.
   */
  context: "composer" | "historical";
}

export function renderTokenChip(args: RenderTokenChipArgs): HTMLElement {
  const dom = createTokenContainer(args.attrs, args.type, args.context);
  const renderer = args.config?.renderCustomToken;

  if (!renderer) {
    dom.appendChild(createDefaultChip(args.attrs));
    return dom;
  }

  const item: SuggestionItem = {
    id: typeof args.attrs.id === "string" ? args.attrs.id : "",
    label: typeof args.attrs.label === "string" ? args.attrs.label : "",
    ...((args.attrs.data ?? {}) as Record<string, unknown>),
  };

  let result: HTMLElement | ReactNode | undefined;
  try {
    result = renderer(item);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      "Error in renderCustomToken, falling back to default chip:",
      error,
    );
    dom.appendChild(createDefaultChip(args.attrs));
    return dom;
  }

  if (result == null) {
    dom.appendChild(createDefaultChip(args.attrs));
    return dom;
  }

  // Bridge the custom chip into the page's light DOM via the shared portal
  // handshake. The default chip rides along as the `<slot>` fallback so the
  // token still shows something until the portal commits.
  const { container } = renderInLightDom({
    content: result,
    dispatchTarget: args.dispatchTarget ?? dom,
    fallback: createDefaultChip(args.attrs),
  });
  dom.appendChild(container);

  return dom;
}

function createTokenContainer(
  attrs: TokenChipAttrs,
  type: string,
  context: "composer" | "historical",
): HTMLElement {
  ensureTokenStyleRules();
  const dom = document.createElement("span");
  const value = typeof attrs.value === "string" ? attrs.value : null;
  const label = typeof attrs.label === "string" ? attrs.label : null;
  dom.setAttribute("contenteditable", "false");
  dom.setAttribute("data-token-type", type);
  dom.setAttribute("data-token-context", context);
  dom.setAttribute("data-raw-value", value ?? label ?? "");
  dom.setAttribute("role", "img");
  dom.setAttribute("aria-label", label || value || "");
  dom.className = "cds-aichat--token";
  return dom;
}

function createDefaultChip(attrs: TokenChipAttrs): HTMLElement {
  const chip = document.createElement("span");
  const label = typeof attrs.label === "string" ? attrs.label : null;
  const value = typeof attrs.value === "string" ? attrs.value : null;
  const trigger = typeof attrs.trigger === "string" ? attrs.trigger : "";
  chip.textContent = `${trigger}${label || value || ""}`;
  return chip;
}
