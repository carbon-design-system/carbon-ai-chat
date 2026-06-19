/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { type ReactNode } from "react";

import type { MarkdownItPlugin } from "../../types/config/PublicConfig";

/**
 * Permissive context value used by `MarkdownWithDefaults`. Accepts callbacks
 * returning either a `ReactNode` (set by the React `ChatContainer` from
 * `ChatContainerPropsMarkdown.customRenderers`) or an `HTMLElement | null`
 * (set by `cds-aichat-container` / `cds-aichat-custom-element` from
 * `WCMarkdown.customRenderers`). The component dispatches based on the
 * runtime return type.
 */
export interface MarkdownConfigContextValue {
  markdownItPlugins?: MarkdownItPlugin[];
  customRenderers?: {
    table?: (args: unknown) => ReactNode | HTMLElement | null;
    codeBlock?: (args: unknown) => ReactNode | HTMLElement | null;
  };
}

/**
 * Provides the merged `markdown` config to deep consumers like
 * `MarkdownWithDefaults`. The shell sets the value once from
 * `ChatContainerProps.markdown` (React) or `cds-aichat-container.markdown`
 * (web component); consumers read it with `useContext(MarkdownConfigContext)`.
 */
const MarkdownConfigContext = React.createContext<
  MarkdownConfigContextValue | undefined
>(undefined);

export { MarkdownConfigContext };
