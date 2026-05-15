/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// Canonical type definitions live in @carbon/ai-chat-components.
import type {
  SuggestionItem,
  CustomListProps,
  SuggestionConfig,
} from "@carbon/ai-chat-components/es/components/input/src/types.js";
import { SuggestionType } from "@carbon/ai-chat-components/es/components/input/src/types.js";

// Re-export the canonical input types through this module so the consumer
// surface (and TypeDoc) sees them at a stable @carbon/ai-chat path.
export type { SuggestionItem, CustomListProps, SuggestionConfig };
export { SuggestionType };

/**
 * Configuration for the input field in the main chat and homescreen.
 *
 * @category Config
 */
export interface InputConfig {
  /**
   * The maximum number of characters allowed in the input field. Defaults to 10000.
   */
  maxInputCharacters?: number;

  /**
   * Controls whether the main input surface is visible when the chat loads.
   * Defaults to true.
   */
  isVisible?: boolean;

  /**
   * If true, the main input surface starts in a disabled (read-only) state.
   * Equivalent to {@link PublicConfig.isReadonly}, but scoped just to the assistant input.
   */
  isDisabled?: boolean;

  /**
   * Configuration for input suggestions (mentions, commands, autocomplete).
   * Enables token-based autocomplete with configurable triggers and items.
   *
   * @experimental
   */
  suggestions?: SuggestionConfig[];
}
