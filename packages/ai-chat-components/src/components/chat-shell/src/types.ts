/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Represents a position in the layout (start or end)
 */
export type StartOrEnd = "start" | "end";

/**
 * Corner style options
 */
export type CornerStyle = "round" | "square";

/**
 * Corner position identifiers
 */
export type CornerPosition =
  | "start-start"
  | "start-end"
  | "end-start"
  | "end-end";

/**
 * Configuration for corner styles
 */
export interface CornerConfig {
  cornerAll: CornerStyle;
  cornerStartStart?: CornerStyle;
  cornerStartEnd?: CornerStyle;
  cornerEndStart?: CornerStyle;
  cornerEndEnd?: CornerStyle;
}

/**
 * Configuration for an observed slot
 */
export interface SlotConfig {
  name: string;
  stateKey: keyof SlotContentState;
}

/**
 * State tracking which slots have content
 */
export interface SlotContentState {
  hasHeaderContent: boolean;
  hasHeaderAfterContent: boolean;
  hasFooterContent: boolean;
  hasInputContent: boolean;
  hasInputAfterContent: boolean;
  hasInputBeforeContent: boolean;
}

/**
 * Keys for tracking initial state completion
 */
export type InitialStateKey =
  | "inputAndMessagesAtMaxWidth"
  | "shouldRenderHistory"
  | "hasSlotContent";

/**
 * State tracking for input and messages width
 */
export interface WidthState {
  isAtMaxWidth: boolean;
  currentWidth: number;
}

/**
 * State tracking for main content body
 */
export interface BodyState {
  shouldRenderHistory: boolean;
  width: number;
}

// Made with Bob
