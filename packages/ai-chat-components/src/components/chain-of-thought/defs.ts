/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Status of the chain of thought step.
 *
 * @category Messaging
 */
enum ChainOfThoughtStepStatus {
  /**
   * If the tool call is currently processing.
   */
  PROCESSING = "processing",

  /**
   * If the tool call failed.
   */
  FAILURE = "failure",

  /**
   * If the tool call succeeded.
   */
  SUCCESS = "success",
}

/**
 * A function to allow the chat component to properly scroll to the element on toggle.
 */
type ChainOfThoughtOnToggle = (
  /**
   * Whether the container is open after the toggle.
   */
  isOpen: boolean,

  /**
   * Target element to scroll into view if needed.
   */
  scrollToElement: HTMLElement,
) => void;

/**
 * Event detail for a chain-of-thought toggle interaction.
 */
interface ChainOfThoughtToggleEventDetail {
  /**
   * Whether the container is open after the toggle event.
   */
  open: boolean;

  /**
   * The panel id connected to the toggle button.
   */
  panelId?: string;
}

/**
 * Event detail for a single chain-of-thought step toggle.
 */
interface ChainOfThoughtStepToggleEventDetail {
  /**
   * Whether the step is expanded after the toggle event.
   */
  open: boolean;
}

export {
  type ChainOfThoughtOnToggle,
  ChainOfThoughtStepStatus,
  type ChainOfThoughtStepToggleEventDetail,
  type ChainOfThoughtToggleEventDetail,
};
