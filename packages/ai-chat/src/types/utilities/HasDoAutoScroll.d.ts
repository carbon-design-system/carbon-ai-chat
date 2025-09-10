/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This allows for providing child components of MessagesComponent the ability to call the doAutoScroll function in
 * {@link MessagesComponent.doAutoScroll}.
 */
interface HasDoAutoScroll {
  /**
   * This will execute an auto-scroll operation based on the current state of messages in the component. This should
   * be called whenever the messages change.
   */
  doAutoScroll?: (options?: AutoScrollOptions) => void;
}

/**
 * Options for controlling how the scrolling occurs.
 */
interface AutoScrollOptions {
  /**
   * Indicates that the container should scroll to the given "scroll bottom" value meaning the content is scrolled down
   * from the top by that amount. A value of 0 will scroll to the very top.
   */
  scrollToTop?: number;

  /**
   * Indicates that the container should scroll to the given "scroll bottom" value meaning the content is scrolled up
   * from the bottom by that amount. A value of 0 will scroll to the very bottom.
   */
  scrollToBottom?: number;

  /**
   * If appropriate, prefer animations.
   */
  preferAnimate?: true;
}

export { HasDoAutoScroll, AutoScrollOptions };
