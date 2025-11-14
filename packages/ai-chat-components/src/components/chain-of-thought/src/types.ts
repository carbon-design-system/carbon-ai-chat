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
  PROCESSING = "processing",
  FAILURE = "failure",
  SUCCESS = "success",
}

/**
 * A chain of thought step is meant to show tool calls and other steps made by your agent
 * to reach its final answer.
 *
 * @category Messaging
 */
interface ChainOfThoughtStep {
  /**
   * The plain text name of the step.
   */
  title?: string;

  /**
   * An optional human readable description of what the tool does.
   *
   * Accepts markdown formatted text.
   */
  description?: string;

  /**
   * The plain text name of the tool called.
   */
  tool_name?: string;

  /**
   * Optional request metadata sent to a tool.
   */
  request?: {
    /**
     * Arguments sent to the tool. If this is properly formed JSON, it will be shown as a code block.
     */
    args?: unknown;
  };

  /**
   * Optional response from a tool.
   */
  response?: {
    /**
     * Content returned by the tool. If this is properly formed JSON, it will be shown as a code block.
     *
     * You can also return markdown compatible text here.
     */
    content: unknown;
  };

  /**
   * Optionally, share the status of this step. An icon will appear in the view showing the status. If no status is
   * shared, the UI will assume success.
   */
  status?: ChainOfThoughtStepStatus;
}

/**
 * A function to allow the chat component to properly scroll to the element on toggle.
 *
 * @category Messaging
 */
type ChainOfThoughtOnToggle = (
  isOpen: boolean,
  scrollToElement: HTMLElement,
) => void;

/**
 * @category Messaging
 */
interface ChainOfThoughtStepWithToggle extends ChainOfThoughtStep {
  /**
   * If the step is opened.
   */
  open: boolean;
}

export {
  type ChainOfThoughtOnToggle,
  type ChainOfThoughtStep,
  ChainOfThoughtStepStatus,
  type ChainOfThoughtStepWithToggle,
};
