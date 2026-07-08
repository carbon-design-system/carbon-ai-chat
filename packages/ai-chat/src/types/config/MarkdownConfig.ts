/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ReactNode } from "react";
import type {
  MarkdownRendererChecklist,
  MarkdownRendererImageArgs,
  MarkdownRendererImageResult,
  MarkdownRendererLinkArgs,
  MarkdownRendererLinkResult,
} from "@carbon/ai-chat-components/es/components/markdown/index.js";

import type { MarkdownItPlugin } from "./PublicConfig";

/**
 * Resolved markdown config consumed by `MarkdownWithDefaults`. The element
 * replacements (`table`, `codeBlock`) accept callbacks returning either a
 * `ReactNode` (set by the React `ChatContainer` from
 * `ChatContainerPropsMarkdown.customRenderers`) or an `HTMLElement | null` (set
 * by `cds-aichat-container` / `cds-aichat-custom-element` from
 * `WCMarkdown.customRenderers`); the component dispatches based on the runtime
 * return type. The attribute transforms (`link`, `image`) and the `checklist`
 * hook are framework-neutral, so they carry their precise types unchanged.
 *
 * Carried through the store as the `markdownConfig` slice — set from the
 * `markdown` prop in `ChatAppEntry` and read with `useSelector` — so it reaches
 * the deep `MarkdownWithDefaults` consumer without a global context provider.
 */
export interface MarkdownConfig {
  markdownItPlugins?: MarkdownItPlugin[];
  customRenderers?: {
    table?: (args: unknown) => ReactNode | HTMLElement | null;
    codeBlock?: (args: unknown) => ReactNode | HTMLElement | null;
    link?: (
      args: MarkdownRendererLinkArgs,
    ) => MarkdownRendererLinkResult | null;
    image?: (
      args: MarkdownRendererImageArgs,
    ) => MarkdownRendererImageResult | null;
    checklist?: MarkdownRendererChecklist;
  };
}
